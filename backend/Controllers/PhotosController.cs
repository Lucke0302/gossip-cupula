using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Galeria de fotos. Uma lista única com as imagens de todos os posts,
/// paginada por cursor opaco.
/// <para>
/// Exige autenticação (JWT), como o resto dos dados. O contrato é o de
/// <c>frontend/src/services/gallery.service.ts</c>, validado por
/// <c>pageSchema(photoSchema)</c> (<c>.strict()</c>): a resposta é exatamente
/// <c>{ items, nextCursor }</c>.
/// </para>
/// </summary>
[Authorize]
[ApiController]
[Route("api/photos")]
public class PhotosController(IPhotoService photoService) : ControllerBase
{
    /// <summary>
    /// Uma página da galeria, das fotos mais recentes para as mais antigas.
    /// Query string: <c>cursor</c> (opaco, devolvido no campo <c>nextCursor</c>
    /// da página anterior) e <c>limit</c> (1..60, padrão 12).
    /// </summary>
    /// <response code="200">Envelope <c>{ items, nextCursor }</c>.</response>
    /// <response code="401">Token ausente/inválido.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Page<PhotoResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<Page<PhotoResponseDto>>> List(
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = PhotoService.DefaultPageSize)
    {
        var page = await photoService.GetPageAsync(cursor, limit);
        return Ok(page);
    }
}
