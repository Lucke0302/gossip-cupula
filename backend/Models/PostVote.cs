namespace GossipCupula.Api.Models;

/// <summary>
/// Tipo de voto do usuário em um post.
/// Like = 1 e Dislike = -1 permitem calcular o score somando os valores.
/// </summary>
public enum VoteType
{
    Like = 1,
    Dislike = -1
}

/// <summary>
/// Tabela intermediária de votos (like/dislike).
/// Cada usuário pode votar apenas uma vez por post — garantido pela chave
/// composta (PostId, UserId).
/// </summary>
public class PostVote
{
    public Guid PostId { get; set; }

    public Guid UserId { get; set; }

    public VoteType Vote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Post Post { get; set; } = null!;

    public User User { get; set; } = null!;
}
