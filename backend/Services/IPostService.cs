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

    /// <summary>
    /// Retorna se o post já foi gossipificado (<c>IsGossipfyed</c>).
    /// <c>null</c> quando o post não existe. Usado pelo endpoint de IA para
    /// impedir a dupla gossipficação.
    /// </summary>
    Task<bool?> GetIsGossipfyedAsync(Guid postId);

    Task<PostResponseDto> CreateAsync(CreatePostDto createPostDto);

    /// <summary>
    /// Publica um post recebido por <c>multipart/form-data</c> (texto +
    /// imagens opcionais). Sobe as imagens para o object storage em paralelo
    /// e grava o post com as URLs públicas resolvidas.
    /// </summary>
    Task<PostResponseDto> CreateAsync(CreatePostFormRequest formRequest);

    /// <summary>
    /// Atualiza o post. Apenas usuários com role "Admin" podem editar;
    /// currentUserId é usado apenas para auditar EditedBy.
    /// </summary>
    Task<PostResponseDto?> UpdateAsync(Guid postId, UpdatePostDto updatePostDto, Guid currentUserId, string currentUserRole);

    Task<bool> DeleteAsync(Guid postId, string currentUserRole);
}
