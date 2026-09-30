using GossipCupula.Api.DTOs.Comments;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Comentários de um post — rotas aninhadas em
/// <c>/api/posts/{postId}/comments</c>.
/// <para>
/// Exige autenticação (JWT), mas o usuário do token <b>não</b> é gravado em
/// lugar nenhum: o comentário é 100% anônimo ("sem nome, sem foto, sem @").
/// </para>
/// </summary>
[Authorize]
[ApiController]
[Route("api/posts/{postId:guid}/comments")]
public class CommentController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>
    /// Publica um comentário anônimo no post. 404 quando o post não existe.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CommentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommentResponse>> Create(Guid postId, [FromBody] CreateCommentRequest request)
    {
        var created = await _commentService.CreateAsync(postId, request);

        if (created is null)
        {
            return NotFound();
        }

        // Sem header Location: não existe rota para ler um comentário
        // isolado — a leitura é sempre a coleção do post.
        return StatusCode(StatusCodes.Status201Created, created);
    }

    /// <summary>
    /// Lista os comentários do post (mais recentes primeiro), paginados por
    /// cursor opaco. Query string: <c>cursor</c> (opaco, devolvido no campo
    /// <c>nextCursor</c> da página anterior) e <c>limit</c> (1..100, padrão 20).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(Page<CommentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<Page<CommentResponse>>> GetPage(
        Guid postId,
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = CommentService.DefaultPageSize)
    {
        var page = await _commentService.GetPageAsync(postId, cursor, limit);
        return Ok(page);
    }

    /// <summary>
    /// Contador de comentários do post: consulta o banco (<c>COUNT</c>) e
    /// devolve <c>{ "count": X }</c>. Rota própria e isolada porque é o único
    /// dado que o cartão do post precisa — carregar a listagem paginada só
    /// para mostrar um número seria caro em todos os sentidos.
    /// </summary>
    /// <remarks>
    /// Post inexistente devolve 200 com <c>count: 0</c>, igual ao
    /// <c>GET</c> da listagem: nenhuma das duas rotas valida a existência do
    /// post, elas apenas filtram por <c>PostId</c>.
    /// </remarks>
    [HttpGet("count")]
    [ProducesResponseType(typeof(CommentCountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CommentCountResponse>> Count(Guid postId)
    {
        var count = await _commentService.CountAsync(postId);
        return Ok(new CommentCountResponse { Count = count });
    }
}
