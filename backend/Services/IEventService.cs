using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Events;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do serviço de eventos do calendário.
/// <para>
/// Eventos são a única exceção de autoria do site: <c>authorName</c> existe na
/// resposta, mas <b>só</b> quando a pessoa escolheu assinar — e o nome vem do
/// token, nunca do corpo. Fora isso, nada do usuário atravessa a resposta: nem
/// no evento, nem no resultado do toggle de presença.
/// </para>
/// </summary>
public interface IEventService
{
    /// <summary>
    /// Eventos de um mês (<c>month</c> no formato <c>YYYY-MM</c>), ordenados por
    /// data. O <c>goingCount</c> e o <c>isGoing</c> saem projetados na própria
    /// query, a partir das presenças.
    /// <para>
    /// Lança <see cref="ArgumentException"/> quando o mês vem ausente ou fora do
    /// formato (a controller traduz em 400).
    /// </para>
    /// </summary>
    Task<Page<EventResponseDto>> ListEventsAsync(string? month);

    /// <summary>
    /// Fixa um evento no calendário. Aplica os fallbacks do contrato para os
    /// campos opcionais, grava <c>AuthorName</c> apenas quando
    /// <c>Signed</c> é <c>true</c> e registra quem fixou já como confirmado
    /// (o <c>isGoing: true</c> / <c>goingCount: 1</c> do POST).
    /// </summary>
    Task<EventResponseDto> CreateEventAsync(CreateEventRequestDto request);

    /// <summary>
    /// Alterna a presença do usuário logado: adiciona a confirmação quando ela
    /// não existe, remove quando existe. Devolve a contagem já atualizada e o
    /// estado de quem chamou.
    /// <para>
    /// Lança <see cref="KeyNotFoundException"/> quando o evento não existe (a
    /// controller traduz em 404).
    /// </para>
    /// </summary>
    Task<GoingResultDto> ToggleGoingAsync(Guid eventId);

    /// <summary>
    /// Remove o evento do calendário.
    /// <para>
    /// Não existe dono para conferir: <c>authorName</c> é assinatura, não
    /// propriedade, então qualquer pessoa da cúpula pode desfixar. As presenças
    /// do evento saem junto pelo <c>ON DELETE CASCADE</c> da FK — nenhuma linha
    /// órfã em <c>EventPresences</c>.
    /// </para>
    /// <para>
    /// Lança <see cref="KeyNotFoundException"/> quando o evento não existe (a
    /// controller traduz em 404).
    /// </para>
    /// </summary>
    Task DeleteEventAsync(Guid eventId);
}
