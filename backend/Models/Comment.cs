namespace GossipCupula.Api.Models;

/// <summary>
/// Comentário de um post.
/// <para>
/// Assim como os posts, o comentário é 100% anônimo: NÃO existe UserId,
/// AuthorId, OwnerId nem qualquer relação com a tabela de usuários — o banco
/// simplesmente não registra quem escreveu ("sem nome, sem foto, sem @").
/// </para>
/// </summary>
public class Comment
{
    public Guid Id { get; set; }

    /// <summary>
    /// Post comentado (FK). Todo comentário pertence a exatamente um post e
    /// é apagado em cascata quando o post é excluído.
    /// </summary>
    public Guid PostId { get; set; }

    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Gravado sempre com <c>DateTime.UtcNow</c>.
    /// <para>
    /// Aqui fica a precisão total do instante: é ela que dá ao cursor de
    /// paginação uma ordem determinística (mais recentes primeiro). O que a
    /// API devolve na resposta (<c>CommentResponse.PublishedAt</c>) é esse
    /// mesmo instante arredondado para a hora cheia em UTC.
    /// </para>
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Post Post { get; set; } = null!;
}
