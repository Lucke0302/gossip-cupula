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

    /// <summary>
    /// URLs públicas das imagens anexadas ao post, na ordem de exibição.
    /// <para>
    /// O Npgsql mapeia <c>List&lt;string&gt;</c> nativamente para a coluna
    /// <c>text[]</c> do PostgreSQL (primitiva collection): não existe tabela
    /// auxiliar, tabela de imagens nem JSON — é um array de textos no banco.
    /// </para>
    /// </summary>
    public List<string> ImageUrls { get; set; } = new();

    public ICollection<PostVote> Votes { get; set; } = new List<PostVote>();

    /// <summary>
    /// Comentários do post (1:N). Também são 100% anônimos: não existe
    /// relação nenhuma entre um comentário e a tabela de usuários.
    /// </summary>
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}


