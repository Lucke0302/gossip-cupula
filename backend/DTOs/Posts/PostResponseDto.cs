namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de resposta com os dados de um post.
/// </summary>
public class PostResponseDto
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Autor exibido do post. Como todo post é 100% anônimo, é sempre
    /// "Gossip Girl".
    /// </summary>
    public string OwnerUsername { get; set; } = "Gossip Girl";

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Preenchido com DateTime.UtcNow sempre que o post for editado.
    /// </summary>
    public DateTime? EditedAt { get; set; }

    /// <summary>
    /// Id do usuário que realizou a última edição.
    /// </summary>
    public Guid? EditedBy { get; set; }

    /// <summary>
    /// URLs públicas das imagens anexadas (bucket do OCI Object Storage).
    /// Lista vazia quando o post não tem foto — nunca <c>null</c>.
    /// </summary>
    public List<string> ImageUrls { get; set; } = new();

    /// <summary>
    /// Indica se o post já passou pelo pipeline de gossipficação (IA).
    /// </summary>
    public bool IsGossipfyed { get; set; }

    /// <summary>
    /// Quantidade de comentários do post.
    /// <para>
    /// Vem projetada na própria consulta (COUNT correlacionado no mesmo
    /// SELECT): a lista de posts inteira custa uma query só, e não uma query
    /// por post (N+1).
    /// </para>
    /// </summary>
    public int CommentCount { get; set; }

    /// <summary>
    /// Quantidade de likes (votos com VoteType == 1).
    /// </summary>
    public int LikesCount { get; set; }

    /// <summary>
    /// Quantidade de dislikes (votos com VoteType == -1).
    /// </summary>
    public int DislikesCount { get; set; }
}
