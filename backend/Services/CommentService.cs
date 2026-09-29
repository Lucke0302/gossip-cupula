using System.Text;
using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Comments;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Criação e listagem paginada de comentários de um post.
/// <para>
/// Comentários são 100% anônimos: nada do usuário autenticado (Id, username,
/// e-mail) é gravado — só texto, post e instante de criação.
/// </para>
/// </summary>
public class CommentService(AppDbContext dbContext) : ICommentService
{
    /// <summary>Tamanho da página quando a query string não informa <c>limit</c>.</summary>
    public const int DefaultPageSize = 20;

    /// <summary>Teto de itens por página — protege o banco de um <c>limit</c> gigante.</summary>
    public const int MaxPageSize = 100;

    public async Task<CommentResponse?> CreateAsync(Guid postId, CreateCommentRequest request)
    {
        // Regra: só comenta quem comenta em post que existe (404 na controller).
        var postExists = await dbContext.Posts.AnyAsync(post => post.Id == postId);
        if (!postExists)
        {
            return null;
        }

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            Text = request.Text.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        // Nenhum dado do usuário do token entra aqui, de propósito.
        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync();

        return ToResponse(comment);
    }

    public async Task<Page<CommentResponse>> GetPageAsync(Guid postId, string? cursor, int limit)
    {
        var pageSize = Math.Clamp(limit, 1, MaxPageSize);

        var query = dbContext.Comments
            .AsNoTracking()
            .Where(comment => comment.PostId == postId);

        // Keyset (e não offset): a partir do último item entregue, só o que
        // vem DEPOIS dele em (CreatedAt DESC, Id DESC). O Id desempata
        // comentários gravados no mesmo instante.
        if (CommentCursor.TryDecode(cursor, out var after))
        {
            query = query.Where(comment =>
                comment.CreatedAt < after.CreatedAt ||
                (comment.CreatedAt == after.CreatedAt && comment.Id.CompareTo(after.Id) < 0));
        }

        // Um item a mais que a página: se ele vier, existe página seguinte.
        var rows = await query
            .OrderByDescending(comment => comment.CreatedAt)
            .ThenByDescending(comment => comment.Id)
            .Take(pageSize + 1)
            .Select(comment => new { comment.Id, comment.Text, comment.CreatedAt })
            .ToListAsync();

        var hasMore = rows.Count > pageSize;
        var page = hasMore ? rows[..pageSize] : rows;

        var items = page
            .Select(row => new CommentResponse
            {
                Id = row.Id,
                Text = row.Text,
                PublishedAt = CoarsenToHour(row.CreatedAt)
            })
            .ToList();

        return new Page<CommentResponse>
        {
            Items = items,
            NextCursor = hasMore && page.Count > 0
                ? CommentCursor.Encode(page[^1].CreatedAt, page[^1].Id)
                : null
        };
    }

    private static CommentResponse ToResponse(Comment comment) => new()
    {
        Id = comment.Id,
        Text = comment.Text,
        PublishedAt = CoarsenToHour(comment.CreatedAt)
    };

    /// <summary>
    /// Arredonda para a hora cheia em UTC.
    /// <para>
    /// É regra de anonimato, não de formatação: um instante com precisão de
    /// segundos cruzado com o horário de acesso denunciaria quem comentou
    /// ("foi quem saiu da mesa 23h47"). O front valida exatamente isso
    /// (<c>coarseTimestampSchema</c>) e rejeita o valor se vier "cheio".
    /// </para>
    /// </summary>
    private static DateTime CoarsenToHour(DateTime value)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, 0, 0, DateTimeKind.Utc);
    }

    /// <summary>Posição do último item entregue — a chave do keyset.</summary>
    private readonly record struct CursorValue(DateTime CreatedAt, Guid Id);

    /// <summary>
    /// Empacota e desempacota o cursor em base64url.
    /// <para>
    /// É opaco por convenção: o cliente só devolve a string que recebeu, nada
    /// de <c>?page=2</c>, que exporia ordem e volume. Um cursor inválido é
    /// ignorado (a listagem recomeça do topo) em vez de virar 400 — mesmo
    /// comportamento do adaptador de posts do front quando o cursor some.
    /// </para>
    /// </summary>
    private static class CommentCursor
    {
        public static string Encode(DateTime createdAtUtc, Guid id) =>
            Base64UrlEncode($"{createdAtUtc.Ticks}|{id:N}");

        public static bool TryDecode(string? cursor, out CursorValue value)
        {
            value = default;

            if (string.IsNullOrWhiteSpace(cursor) || !TryBase64UrlDecode(cursor, out var decoded))
            {
                return false;
            }

            var parts = decoded.Split('|');
            if (parts.Length != 2 ||
                !long.TryParse(parts[0], out var ticks) ||
                !Guid.TryParseExact(parts[1], "N", out var id))
            {
                return false;
            }

            value = new CursorValue(new DateTime(ticks, DateTimeKind.Utc), id);
            return true;
        }

        private static string Base64UrlEncode(string text) =>
            Convert.ToBase64String(Encoding.UTF8.GetBytes(text))
                   .Replace('+', '-')
                   .Replace('/', '_')
                   .TrimEnd('=');

        private static bool TryBase64UrlDecode(string cursor, out string decoded)
        {
            decoded = string.Empty;

            try
            {
                var base64 = cursor.Replace('-', '+').Replace('_', '/');
                base64 = (base64.Length % 4) switch
                {
                    2 => base64 + "==",
                    3 => base64 + "=",
                    _ => base64
                };

                decoded = Encoding.UTF8.GetString(Convert.FromBase64String(base64));
                return true;
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
