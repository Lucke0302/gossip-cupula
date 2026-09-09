using System.Security.Claims;
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
    private readonly IPostService _postService;
    private readonly IVoteService _voteService;

    public PostController(IPostService postService, IVoteService voteService)
    {
        _postService = postService;
        _voteService = voteService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PostResponseDto>>> GetAll()
    {
        var posts = await _postService.GetAllAsync();
        return Ok(posts);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PostResponseDto>> GetById(Guid id)
    {
        var post = await _postService.GetByIdAsync(id);
        return post is null ? NotFound() : Ok(post);
    }

    [HttpPost]
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
