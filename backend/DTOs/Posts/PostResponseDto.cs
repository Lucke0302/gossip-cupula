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
    /// Quantidade de likes (votos com VoteType == 1).
    /// </summary>
    public int LikesCount { get; set; }

    /// <summary>
    /// Quantidade de dislikes (votos com VoteType == -1).
    /// </summary>
    public int DislikesCount { get; set; }
}
