namespace GossipCupula.Api.DTOs.Events;

/// <summary>
/// Evento como ele trafega na resposta (<c>{ items }</c> do GET, <c>201</c> do
/// POST).
/// <para>
/// O contrato na rede é exatamente <c>{ id, date, title, time, place,
/// description, color, authorName, goingCount, isGoing }</c> — o mesmo que o
/// front valida em <c>frontend/src/types/index.ts</c> (<c>eventSchema</c>, que
/// é <c>.strict()</c>). Qualquer campo extra (um <c>createdAt</c>, um
/// <c>userId</c>, a lista de quem confirmou) faz a validação Zod do front
/// quebrar com <c>unrecognized_keys</c>.
/// </para>
/// <para>
/// <c>Date</c> e <c>Time</c> são <b>string</b> de propósito: o JSON precisa de
/// <c>"2026-10-24"</c> e <c>"23:00"</c>. Um <see cref="TimeOnly"/> serializaria
/// como <c>"23:00:00"</c> e o regex do front (<c>horaSchema</c>) recusaria.
/// </para>
/// </summary>
public class EventResponseDto
{
    public Guid Id { get; set; }

    /// <summary>Data no formato <c>YYYY-MM-DD</c> (grão = dia, sem hora).</summary>
    public string Date { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Horário <c>"HH:mm"</c> (24h) ou <c>null</c> quando ainda não foi
    /// definido ("a confirmar" é texto de tela, não valor guardado).
    /// </summary>
    public string? Time { get; set; }

    public string Place { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    /// <summary>Cor da estrelinha em hexadecimal (<c>#RRGGBB</c>).</summary>
    public string Color { get; set; } = string.Empty;

    /// <summary>
    /// Assinatura de quem fixou o evento — <c>null</c>, que é o padrão. Só é
    /// preenchido quando a pessoa marcou "assinar" no POST; sem isso o nome nem
    /// chega a ser gravado (não é "gravar e esconder").
    /// </summary>
    public string? AuthorName { get; set; }

    /// <summary>
    /// Quantas pessoas confirmaram presença. É um agregado: a API nunca diz
    /// <b>quem</b> confirmou.
    /// </summary>
    public int GoingCount { get; set; }

    /// <summary>
    /// Se <b>quem pediu</b> confirmou presença. É o único dado pessoal do
    /// objeto, resolvido a partir do token de quem chamou — o
    /// <c>UserId</c> usado nessa conta nunca sai do serviço.
    /// </summary>
    public bool IsGoing { get; set; }
}
