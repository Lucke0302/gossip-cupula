namespace GossipCupula.Api.Models;

/// <summary>
/// Representa um post 100% anônimo ("Gossip Girl") do blog/rede social.
/// Posts não possuem dono (OwnerId/Owner): apenas usuários com a role
/// "Admin" podem editá-los ou excluí-los.
/// </summary>
public class Post
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Preenchido com DateTime.UtcNow sempre que o post for editado.
    /// </summary>
    public DateTime? EditedAt { get; set; }

    /// <summary>
    /// UUID do usuário (Admin) que realizou a última edição.
    /// </summary>
    public Guid? EditedBy { get; set; }

    public ICollection<PostVote> Votes { get; set; } = new List<PostVote>();
}


