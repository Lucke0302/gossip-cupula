using GossipCupula.Api.DTOs.AI;
using GossipCupula.Api.Exceptions;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Endpoints de IA ("Gossipficar"). Exige autenticação (JWT): apenas usuários
/// logados podem transformar textos no estilo "Gossip Girl".
/// </summary>
[Authorize]
[ApiController]
[Route("api/ai")]
public class AITransformationController : ControllerBase
{
    private readonly IAITextTransformationService _aiTextTransformationService;
    private readonly IPostService _postService;
    private readonly ILogger<AITransformationController> _logger;

    public AITransformationController(
        IAITextTransformationService aiTextTransformationService,
        IPostService postService,
        ILogger<AITransformationController> logger)
    {
        _aiTextTransformationService = aiTextTransformationService;
        _postService = postService;
        _logger = logger;
    }

    /// <summary>
    /// Transforma um texto comum em uma fofoca no estilo "Gossip Girl".
    /// <para>
    /// Quando <c>postId</c> é informado, valida no banco se o post já passou
    /// pelo pipeline de IA (<c>IsGossipfyed</c>): se sim, recusa a operação
    /// (400) para impedir a dupla gossipficação.
    /// </para>
    /// </summary>
    [HttpPost("gossipfy")]
    [ProducesResponseType(typeof(GossipfyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<GossipfyResponse>> Gossipfy(
        [FromBody] GossipfyRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "O campo 'content' é obrigatório e não pode ser vazio." });
        }

        // Prevenção de dupla gossipficação: só valida quando um postId real foi enviado.
        if (request.PostId is { } postId && postId != Guid.Empty)
        {
            var isGossipfyed = await _postService.GetIsGossipfyedAsync(postId);

            if (isGossipfyed is null)
            {
                return NotFound(new { message = "Post não encontrado." });
            }

            if (isGossipfyed.Value)
            {
                return BadRequest(new { message = "Este post já foi gossipificado e não pode ser transformado novamente." });
            }
        }

        try
        {
            var result = await _aiTextTransformationService.TransformAsync(request.Content, cancellationToken);

            return Ok(new GossipfyResponse
            {
                OriginalContent = result.OriginalContent,
                TransformedContent = result.TransformedContent,
                Warnings = result.Warnings
            });
        }
        catch (AITransformationException ex)
        {
            _logger.LogError(ex, "Falha ao executar o pipeline de gossipficação.");

            return Problem(
                title: "Falha ao transformar o conteúdo.",
                detail: ex.Message,
                statusCode: ex.StatusCode is >= 400 and < 600 ? ex.StatusCode : StatusCodes.Status502BadGateway);
        }
    }
}
