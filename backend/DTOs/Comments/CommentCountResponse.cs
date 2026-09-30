namespace GossipCupula.Api.DTOs.Comments;

/// <summary>
/// Resposta do <c>GET /api/posts/{postId}/comments/count</c>: exatamente
/// <c>{ "count": 3 }</c>.
/// <para>
/// Só o número: nem lista de comentários, nem autor, nem instante. É o que a
/// tela precisa para o contador — não é uma listagem disfarçada.
/// </para>
/// </summary>
public class CommentCountResponse
{
    /// <summary>Quantidade de comentários do post (0 quando não há nenhum).</summary>
    public int Count { get; set; }
}
