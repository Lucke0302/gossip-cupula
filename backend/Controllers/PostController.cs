using System.Security.Claims;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Posts;
using GossipCupula.Api.DTOs.Votes;
using GossipCupula.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GossipCupula.Api.Controllers;

/// <summary>
/// Endpoints REST de posts. Todos exigem autenticação (JWT).
/// </summary>
[Authorize]
[ApiController]
[Route("api/posts")]
public class PostController : ControllerBase
{
    /// <summary>
    /// Teto do request multipart inteiro (texto + imagens): 6x o limite de
    /// uma imagem, para caber o lote máximo com folga. Sem isso, o limite
    /// padrão do Kestrel (30 MB) cortaria um post com três fotos de 10 MB.
    /// </summary>
    private const long MaxMultipartRequestBytes = 60L * 1024 * 1024;

    private readonly IPostService _postService;
    private readonly IVoteService _voteService;

    public PostController(IPostService postService, IVoteService voteService)
    {
        _postService = postService;
        _voteService = voteService;
    }

    /// <summary>
    /// Uma página do feed (mais recentes primeiro), paginada por cursor opaco.
    /// Query string: <c>cursor</c> (opaco, devolvido no campo <c>nextCursor</c>
    /// da página anterior) e <c>limit</c> (1..50, padrão 10).
    /// </summary>
    /// <response code="200">Envelope <c>{ items, nextCursor }</c>.</response>
    /// <response code="401">Token ausente/inválido.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Page<PostResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<Page<PostResponseDto>>> GetPage(
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = PostService.DefaultPageSize)
    {
        var page = await _postService.GetPageAsync(cursor, limit);
        return Ok(page);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PostResponseDto>> GetById(Guid id)
    {
        var post = await _postService.GetByIdAsync(id);
        return post is null ? NotFound() : Ok(post);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxMultipartRequestBytes)]
    [ProducesResponseType(typeof(PostResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<PostResponseDto>> CreateWithImages([FromForm] CreatePostFormRequest formRequest)
    {
        try
        {
            // Todo post é 100% anônimo ("Gossip Girl") — não há dono.
            var created = await _postService.CreateAsync(formRequest);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (StorageUploadException ex)
        {
            // O object storage recusou o arquivo: o problema é de
            // infraestrutura (502), não do payload — e nada foi gravado.
            return Problem(
                detail: ex.Message,
                title: "Falha no upload da imagem.",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    /// <summary>
    /// Publica um post sem imagens pelo contrato antigo
    /// (<c>application/json</c>: <c>title</c> + <c>content</c>).
    /// <para>
    /// Fica em <c>/api/posts/json</c> porque o Swashbuckle não aceita duas
    /// actions no mesmo método+path — e a rota principal
    /// (<c>POST /api/posts</c>) agora é <c>multipart/form-data</c>. Existe
    /// para não quebrar quem já publica por JSON.
    /// </para>
    /// </summary>
    [HttpPost("json")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(PostResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PostResponseDto>> Create([FromBody] CreatePostDto createPostDto)
    {
        // Todo post é 100% anônimo ("Gossip Girl") — não há dono.
        var created = await _postService.CreateAsync(createPostDto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PostResponseDto>> Update(Guid id, [FromBody] UpdatePostDto updatePostDto)
    {
        try
        {
            var updated = await _postService.UpdateAsync(id, updatePostDto, GetCurrentUserId(), GetCurrentUserRole());
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (UnauthorizedAccessException)
        {
            // Usuário autenticado, porém sem role Admin.
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var deleted = await _postService.DeleteAsync(id, GetCurrentUserRole());
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            // Usuário autenticado, porém sem role Admin.
            return Forbid();
        }
    }

    /// <summary>
    /// Registra (ou alterna/remove) um like/dislike do usuário logado no post.
    /// </summary>
    [HttpPost("{id:guid}/vote")]
    public async Task<IActionResult> Vote(Guid id, [FromBody] VoteDto voteDto)
    {
        try
        {
            var (likes, dislikes) = await _voteService.ToggleVoteAsync(id, GetCurrentUserId(), voteDto.VoteType);
            return Ok(new { postId = id, likes, dislikes });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Extrai o UserId (claim NameIdentifier) do token JWT do usuário logado.
    /// </summary>
    private Guid GetCurrentUserId()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idValue, out var userId)
            ? userId
            : throw new UnauthorizedAccessException("Claim de usuário (NameIdentifier) ausente ou inválida no token.");
    }

    /// <summary>
    /// Extrai a Role (claim Role) do token JWT do usuário logado.
    /// </summary>
    private string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    }
}
