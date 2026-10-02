using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Events;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Endpoints REST dos eventos do calendário. Todos exigem autenticação (JWT),
/// como o resto dos dados do site.
/// <para>
/// O contrato é o de <c>frontend/src/services/events.service.ts</c>, validado
/// por schemas Zod <c>.strict()</c>: a resposta do evento tem exatamente os
/// dez campos de <c>eventSchema</c>, e a do toggle exatamente
/// <c>{ eventId, goingCount, isGoing }</c>. Nenhum <c>UserId</c> atravessa
/// nenhuma delas.
/// </para>
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EventsController(IEventService eventService) : ControllerBase
{
    /// <summary>
    /// Eventos de um mês (<c>?month=YYYY-MM</c>), em ordem de data.
    /// </summary>
    /// <response code="200">Envelope <c>{ items, nextCursor }</c> — um mês cabe numa resposta, então <c>nextCursor</c> é sempre <c>null</c>.</response>
    /// <response code="400">Mês ausente ou fora do formato <c>YYYY-MM</c>.</response>
    /// <response code="401">Token ausente/inválido.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Page<EventResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<Page<EventResponseDto>>> List([FromQuery] string? month)
    {
        try
        {
            var page = await eventService.ListEventsAsync(month);
            return Ok(page);
        }
        catch (ArgumentException ex)
        {
            // Mês ausente ou malformado é erro do cliente (400) — e nunca
            // "sem filtro", que devolveria o calendário inteiro.
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Fixa um evento no calendário. Quem fixa já entra confirmado, então a
    /// resposta volta com <c>goingCount: 1</c> e <c>isGoing: true</c>.
    /// </summary>
    /// <response code="201">Evento criado (corpo: <c>EventResponseDto</c>).</response>
    /// <response code="400">Validação do body falhou.</response>
    /// <response code="401">Token ausente/inválido.</response>
    [HttpPost]
    [ProducesResponseType(typeof(EventResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<EventResponseDto>> Create([FromBody] CreateEventRequestDto request)
    {
        var created = await eventService.CreateEventAsync(request);

        // StatusCode em vez de Created(uri): o contrato tem só quatro rotas e
        // não existe GET /api/events/{id}, então um header Location apontaria
        // para uma rota que responde 405 — pior que não ter Location.
        return StatusCode(StatusCodes.Status201Created, created);
    }

    /// <summary>
    /// Remove o evento. Sem dono para conferir: qualquer pessoa da cúpula pode
    /// desfixar. As presenças saem em cascata no banco.
    /// </summary>
    /// <response code="204">Evento excluído (sem corpo).</response>
    /// <response code="401">Token ausente/inválido.</response>
    /// <response code="404">Evento inexistente (ou já removido).</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await eventService.DeleteEventAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Alterna a presença do usuário logado no evento: confirma se ainda não
    /// confirmou, desconfirma se já confirmou. Devolve a contagem atualizada e
    /// o estado de quem chamou — nunca a lista de quem vai.
    /// </summary>
    /// <response code="200">Estado do toggle (corpo: <c>GoingResultDto</c>).</response>
    /// <response code="401">Token ausente/inválido.</response>
    /// <response code="404">Evento inexistente.</response>
    /// <response code="409">Dois cliques simultâneos tentaram gravar a mesma presença.</response>
    [HttpPost("{id:guid}/going")]
    [ProducesResponseType(typeof(GoingResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GoingResultDto>> ToggleGoing(Guid id)
    {
        try
        {
            var result = await eventService.ToggleGoingAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (DbUpdateException)
        {
            // Corrida de duplo clique: as duas requisições leram "não existe" e
            // as duas tentaram inserir. A chave composta (EventId, UserId)
            // barrou a segunda — o banco fez o trabalho, e o cliente recebe um
            // conflito em vez de um 500. Recarregar o evento já mostra o estado
            // certo, porque a primeira gravação permaneceu.
            return Conflict(new
            {
                message = "Confirmação já registrada — recarregue o evento para ver o estado atual."
            });
        }
    }
}
