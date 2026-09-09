using GossipCupula.Api.DTOs.Posts;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do serviço de posts (CRUD com controle de acesso exclusivo Admin).
/// Posts são 100% anônimos ("Gossip Girl"), sem dono.
/// </summary>
public interface IPostService
{
    Task<List<PostResponseDto>> GetAllAsync();

    Task<PostResponseDto?> GetByIdAsync(Guid id);

    Task<PostResponseDto> CreateAsync(CreatePostDto createPostDto);

    /// <summary>
    /// Atualiza o post. Apenas usuários com role "Admin" podem editar;
    /// currentUserId é usado apenas para auditar EditedBy.
    /// </summary>
    Task<PostResponseDto?> UpdateAsync(Guid postId, UpdatePostDto updatePostDto, Guid currentUserId, string currentUserRole);

    Task<bool> DeleteAsync(Guid postId, string currentUserRole);
}
