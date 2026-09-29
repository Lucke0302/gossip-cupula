using GossipCupula.Api.DTOs.Comments;
using GossipCupula.Api.DTOs.Common;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato do serviço de comentários de um post.
/// <para>
/// Comentários são 100% anônimos: nenhum dado de autor (UserId, username,
/// e-mail...) é gravado no banco nem devolvido na resposta. Quem está logado
/// serve apenas para autorizar a requisição.
/// </para>
/// </summary>
public interface ICommentService
{
    /// <summary>
    /// Cria o comentário no post informado.
    /// Retorna <c>null</c> quando o post não existe (a controller traduz em 404).
    /// </summary>
    Task<CommentResponse?> CreateAsync(Guid postId, CreateCommentRequest request);

    /// <summary>
    /// Uma página de comentários do post, dos mais recentes para os mais
    /// antigos, paginada por cursor opaco.
    /// </summary>
    Task<Page<CommentResponse>> GetPageAsync(Guid postId, string? cursor, int limit);
}
