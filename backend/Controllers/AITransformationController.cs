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
    private readonly IGossipifiedPostService _gossipifiedPostService;
    private readonly ILogger<AITransformationController> _logger;

    public AITransformationController(
        IAITextTransformationService aiTextTransformationService,
        IPostService postService,
        IGossipifiedPostService gossipifiedPostService,
        ILogger<AITransformationController> logger)
    {
        _aiTextTransformationService = aiTextTransformationService;
        _postService = postService;
        _gossipifiedPostService = gossipifiedPostService;
        _logger = logger;
    }

    /// <summary>
    /// Transforma um texto comum em uma fofoca no estilo "Gossip Girl".
    /// <para>
    /// Prevenção de dupla gossipficação (antes de chamar a IA):
    /// <list type="bullet">
    ///   <item><c>postId</c> informado: o post já tem <c>GossipifiedPostId</c>?
    ///   Se sim, 400. Se o post não existe, 404.</item>
    ///   <item><c>gossipifiedPostId</c> informado: já existe esse registro na
    ///   tabela <c>GossipifiedPosts</c>? Se sim, 400 (texto temporário já
    ///   transformado).</item>
    /// </list>
    /// Passando pela validação, roda o pipeline (Etapa A + Etapa B), grava um
    /// novo <c>GossipifiedPost</c> e devolve o novo <c>GossipifiedPostId</c>.
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

        // Guarda 1 — post definitivo: só valida quando um postId real foi enviado.
        if (request.PostId is { } postId && postId != Guid.Empty)
        {
            Guid? existingGossipifiedPostId;

            try
            {
                existingGossipifiedPostId = await _postService.GetGossipifiedPostIdAsync(postId);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Post não encontrado." });
            }

            if (existingGossipifiedPostId is not null)
            {
                return BadRequest(new { message = "Este post já foi gossipificado e não pode ser transformado novamente." });
            }
        }

        // Guarda 2 — texto temporário: só valida quando um gossipifiedPostId real foi enviado.
        if (request.GossipifiedPostId is { } gossipifiedPostId && gossipifiedPostId != Guid.Empty)
        {
            var alreadyGossipified = await _gossipifiedPostService.ExistsAsync(gossipifiedPostId, cancellationToken);

            if (alreadyGossipified)
            {
                return BadRequest(new { message = "Este texto temporário já foi gossipificado e não pode ser transformado novamente." });
            }
        }

        try
        {
            var result = await _aiTextTransformationService.TransformAsync(request.Content, cancellationToken);

            // Persiste o rastreio da transformação e devolve o novo Id ao cliente.
            // É a partir daqui que o frontend (ou o post definitivo) marca o texto
            // como "já gossipificado".
            result.GossipifiedPostId = await _gossipifiedPostService.CreateAsync(cancellationToken);

            return Ok(new GossipfyResponse
            {
                OriginalContent = result.OriginalContent,
                TransformedContent = result.TransformedContent,
                Warnings = result.Warnings,
                GossipifiedPostId = result.GossipifiedPostId
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
