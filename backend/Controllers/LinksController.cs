using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Página de links. Uma lista única com as URLs externas extraídas do texto
/// dos posts, paginada por cursor opaco.
/// <para>
/// Exige autenticação (JWT), como o resto dos dados. O contrato é o de
/// <c>frontend/src/services/gallery.service.ts</c>, validado por
/// <c>pageSchema(linkSchema)</c> (<c>.strict()</c>): a resposta é exatamente
/// <c>{ items, nextCursor }</c>.
/// </para>
/// </summary>
[Authorize]
[ApiController]
[Route("api/links")]
public class LinksController(ILinkService linkService) : ControllerBase
{
    /// <summary>
    /// Uma página de links, dos posts mais recentes para os mais antigos.
    /// Query string: <c>cursor</c> (opaco, devolvido no campo <c>nextCursor</c>
    /// da página anterior) e <c>limit</c> (1..100, padrão 20).
    /// </summary>
    /// <response code="200">Envelope <c>{ items, nextCursor }</c>.</response>
    /// <response code="401">Token ausente/inválido.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Page<LinkResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<Page<LinkResponseDto>>> List(
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = LinkService.DefaultPageSize)
    {
        var page = await linkService.GetPageAsync(cursor, limit);
        return Ok(page);
    }
}
