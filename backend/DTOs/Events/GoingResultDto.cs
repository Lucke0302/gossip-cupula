namespace GossipCupula.Api.DTOs.Events;

/// <summary>
/// Resultado do toggle de presença (<c>POST /api/events/{id}/going</c>).
/// <para>
/// O contrato na rede é exatamente <c>{ eventId, goingCount, isGoing }</c> — o
/// mesmo que o front valida (<c>goingResultSchema</c>, <c>.strict()</c>).
/// </para>
/// <para>
/// Repare no que <b>não</b> existe: o <c>UserId</c> que originou a confirmação.
/// O serviço usa o usuário do token para decidir o toggle, mas o identificador
/// não atravessa o DTO — aqui ele apareceria como um campo de autor no corpo da
/// resposta, exatamente o vazamento que o resto do site evita.
/// </para>
/// </summary>
public class GoingResultDto
{
    public Guid EventId { get; set; }

    /// <summary>Contagem de presenças do evento depois do toggle.</summary>
    public int GoingCount { get; set; }

    /// <summary>
    /// Estado de <b>quem pediu</b> depois do toggle: <c>true</c> quando a
    /// confirmação foi adicionada, <c>false</c> quando foi removida.
    /// </summary>
    public bool IsGoing { get; set; }
}
