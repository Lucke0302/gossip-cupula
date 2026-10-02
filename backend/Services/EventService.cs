using System.Globalization;
using System.Security.Claims;
using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Events;
using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Eventos do calendário: criação, listagem por mês e toggle de presença.
/// <para>
/// <b>Regra de privacidade:</b> a tabela <c>EventPresences</c> guarda quem
/// confirmou (é o que impede confirmação duplicada e o que permite responder
/// <c>isGoing</c> após um reload), mas o <c>UserId</c> nunca entra num DTO.
/// A resposta carrega só o agregado (<c>goingCount</c>) e o estado de quem
/// pediu (<c>isGoing</c>). Privacidade é a omissão na leitura, não a ausência
/// no banco.
/// </para>
/// </summary>
public class EventService(
    AppDbContext dbContext,
    IHttpContextAccessor httpContextAccessor) : IEventService
{
    /// <summary>Local padrão quando o POST vem sem <c>place</c>.</summary>
    public const string DefaultPlace = "local em segredo";

    /// <summary>Descrição padrão de evento não assinado (o caso comum).</summary>
    public const string AnonymousDescription = "marcado anonimamente. quem sabe, sabe.";

    /// <summary>Descrição padrão de evento assinado.</summary>
    public const string SignedDescription = "marcado por alguém que não se importou em assinar.";

    public async Task<Page<EventResponseDto>> ListEventsAsync(string? month)
    {
        var currentUserId = GetCurrentUserId();
        var firstDay = ParseMonth(month);
        var firstDayOfNextMonth = firstDay.AddMonths(1);

        // Uma query só: o SELECT já traz as colunas do evento mais os dois
        // agregados das presenças (COUNT e EXISTS correlacionados). Nada de
        // carregar presença nenhuma para a memória.
        var rows = await dbContext.Events
            .AsNoTracking()
            .Where(@event => @event.Date >= firstDay && @event.Date < firstDayOfNextMonth)
            .OrderBy(@event => @event.Date)
            .ThenBy(@event => @event.CreatedAt)
            .Select(@event => new
            {
                @event.Id,
                @event.Date,
                @event.Title,
                @event.Time,
                @event.Place,
                @event.Description,
                @event.Color,
                @event.AuthorName,
                GoingCount = @event.Presences.Count(),
                IsGoing = @event.Presences.Any(presence => presence.UserId == currentUserId)
            })
            .ToListAsync();

        // A formatação fica na memória: o Npgsql não traduz
        // `DateOnly/TimeOnly.ToString("...")` para SQL, e a tradução importa
        // justamente nos agregados — que já vieram prontos do banco.
        var items = rows
            .Select(row => new EventResponseDto
            {
                Id = row.Id,
                Date = row.Date.ToString(CreateEventRequestDto.DateFormat, CultureInfo.InvariantCulture),
                Title = row.Title,
                Time = row.Time?.ToString(CreateEventRequestDto.TimeFormat, CultureInfo.InvariantCulture),
                Place = row.Place,
                Description = row.Description,
                Color = row.Color,
                AuthorName = row.AuthorName,
                GoingCount = row.GoingCount,
                IsGoing = row.IsGoing
            })
            .ToList();

        // Um mês cabe numa resposta: o envelope é o mesmo do resto da API,
        // mas não há paginação de verdade (por isso `nextCursor` é sempre null).
        return new Page<EventResponseDto>
        {
            Items = items,
            NextCursor = null
        };
    }

    public async Task<EventResponseDto> CreateEventAsync(CreateEventRequestDto request)
    {
        var currentUserId = GetCurrentUserId();

        if (!CreateEventRequestDto.TryParseDate(request.Date, out var date))
        {
            throw new ArgumentException(
                $"A data deve estar no formato {CreateEventRequestDto.DateFormat}.",
                nameof(request));
        }

        // Horário é opcional; `null` significa "a confirmar" e assim fica.
        TimeOnly? time = null;
        if (!string.IsNullOrWhiteSpace(request.Time))
        {
            if (!CreateEventRequestDto.TryParseTime(request.Time, out var parsedTime))
            {
                throw new ArgumentException(
                    $"O horário deve estar no formato {CreateEventRequestDto.TimeFormat} (24h).",
                    nameof(request));
            }

            time = parsedTime;
        }

        var eventId = Guid.NewGuid();
        var signed = request.Signed;

        var newEvent = new Event
        {
            Id = eventId,
            Date = date,
            Title = request.Title.Trim(),
            Time = time,
            Place = ResolvePlace(request.Place),
            Description = signed ? SignedDescription : AnonymousDescription,
            Color = request.Color.Trim().ToUpperInvariant(),
            // ASSINATURA, não autoria: sem `signed` o nome NÃO é gravado — não é
            // "gravar e esconder". E o nome sai do token (claim Name), nunca do
            // corpo do request: senão qualquer um assinaria como qualquer pessoa.
            AuthorName = signed ? GetCurrentUserName() : null,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Events.Add(newEvent);

        // Quem fixa a estrelinha já entra confirmado: é o `goingCount: 1` /
        // `isGoing: true` que o criador recebe na resposta do POST.
        dbContext.EventPresences.Add(new EventPresence
        {
            EventId = eventId,
            UserId = currentUserId,
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();

        return ToResponseDto(newEvent, goingCount: 1, isGoing: true);
    }

    public async Task<GoingResultDto> ToggleGoingAsync(Guid eventId)
    {
        var currentUserId = GetCurrentUserId();

        if (!await dbContext.Events.AnyAsync(@event => @event.Id == eventId))
        {
            throw new KeyNotFoundException("Evento não encontrado.");
        }

        // A chave composta (EventId, UserId) garante no banco que só exista uma
        // confirmação por pessoa — e a busca usa exatamente essa chave.
        var existingPresence = await dbContext.EventPresences
            .FirstOrDefaultAsync(presence => presence.EventId == eventId && presence.UserId == currentUserId);

        var isGoing = existingPresence is null;

        if (existingPresence is null)
        {
            dbContext.EventPresences.Add(new EventPresence
            {
                EventId = eventId,
                UserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            dbContext.EventPresences.Remove(existingPresence);
        }

        await dbContext.SaveChangesAsync();

        var goingCount = await dbContext.EventPresences
            .CountAsync(presence => presence.EventId == eventId);

        // Só o agregado e o estado de quem chamou: o UserId do token não sai daqui.
        return new GoingResultDto
        {
            EventId = eventId,
            GoingCount = goingCount,
            IsGoing = isGoing
        };
    }

    public async Task DeleteEventAsync(Guid eventId)
    {
        var existingEvent = await dbContext.Events
            .FirstOrDefaultAsync(@event => @event.Id == eventId);

        if (existingEvent is null)
        {
            throw new KeyNotFoundException("Evento não encontrado.");
        }

        // As presenças saem junto pelo ON DELETE CASCADE de
        // FK_EventPresences_Events_EventId: não há o que carregar nem apagar
        // linha por linha — o banco resolve numa instrução só.
        dbContext.Events.Remove(existingEvent);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Local do evento. Vazio (ou ausente) vira o fallback do contrato —
    /// fixar uma estrelinha tem que continuar rápido.
    /// </summary>
    private static string ResolvePlace(string? place) =>
        string.IsNullOrWhiteSpace(place) ? DefaultPlace : place.Trim();

    /// <summary>
    /// Monta a resposta a partir da entidade já gravada. Usado na criação, onde
    /// a contagem é conhecida sem ir ao banco (o criador é a única presença).
    /// Não devolve nada do usuário além da assinatura opcional.
    /// </summary>
    private static EventResponseDto ToResponseDto(Event @event, int goingCount, bool isGoing) => new()
    {
        Id = @event.Id,
        Date = @event.Date.ToString(CreateEventRequestDto.DateFormat, CultureInfo.InvariantCulture),
        Title = @event.Title,
        Time = @event.Time?.ToString(CreateEventRequestDto.TimeFormat, CultureInfo.InvariantCulture),
        Place = @event.Place,
        Description = @event.Description,
        Color = @event.Color,
        AuthorName = @event.AuthorName,
        GoingCount = goingCount,
        IsGoing = isGoing
    };

    /// <summary>
    /// Primeiro dia do mês pedido (<c>YYYY-MM</c>). O filtro é o intervalo
    /// <c>[primeiro dia, primeiro dia do mês seguinte)</c>: comparar direto com
    /// a coluna <c>Date</c> mantém o índice <c>IX_Events_Date</c> em uso.
    /// </summary>
    /// <exception cref="ArgumentException">Mês ausente ou fora do formato.</exception>
    private static DateOnly ParseMonth(string? month)
    {
        // `2026-10` + `-01` = `2026-10-01`, com o mesmo parse estrito do resto
        // do contrato. Um mês inválido não pode virar "sem filtro": isso
        // devolveria o calendário inteiro em vez de um erro explícito.
        if (CreateEventRequestDto.TryParseDate($"{month?.Trim()}-01", out var firstDay))
        {
            return firstDay;
        }

        throw new ArgumentException(
            "O parâmetro 'month' é obrigatório no formato YYYY-MM.",
            nameof(month));
    }

    /// <summary>
    /// UserId (claim NameIdentifier) do token JWT de quem chamou. É usado apenas
    /// para calcular <c>isGoing</c> e para gravar/remover a presença — nunca para
    /// compor a resposta.
    /// </summary>
    private Guid GetCurrentUserId()
    {
        var idValue = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(idValue, out var userId)
            ? userId
            : throw new UnauthorizedAccessException(
                "Claim de usuário (NameIdentifier) ausente ou inválida no token.");
    }

    /// <summary>
    /// Username (claim Name) do token JWT. Só é chamado quando o evento é
    /// assinado — é a única origem aceitável do <c>AuthorName</c>.
    /// </summary>
    private string GetCurrentUserName()
    {
        var username = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);

        return string.IsNullOrWhiteSpace(username)
            ? throw new UnauthorizedAccessException(
                "Claim de usuário (Name) ausente no token: não há como assinar o evento.")
            : username;
    }
}



