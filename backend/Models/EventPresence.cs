namespace GossipCupula.Api.Models;

/// <summary>
/// Tabela associativa das confirmações de presença em um evento ("estou indo").
/// Cada usuário confirma <b>uma única vez</b> por evento — garantido pela chave
/// composta (EventId, UserId), o que impede spam de confirmações.
/// <para>
/// É o mesmo arranjo de <see cref="PostVote"/>: a linha intermediária guarda a
/// relação <c>evento ↔ usuário</c> e o serviço deriva tudo dela —
/// <c>goingCount</c> é o <c>COUNT</c> destas linhas e <c>isGoing</c> é a
/// existência da linha do usuário autenticado.
/// </para>
/// <para>
/// <b>Nada disto é serializado:</b> o <c>UserId</c> nunca aparece em DTO ou
/// resposta. A privacidade é a omissão na leitura, não a ausência no banco —
/// sem a linha, não haveria como responder <c>isGoing</c> a quem recarrega a
/// página, nem como impedir que a mesma pessoa confirmasse várias vezes.
/// </para>
/// </summary>
public class EventPresence
{
    public Guid EventId { get; set; }

    /// <summary>
    /// Usuário que confirmou presença. É dado interno do banco: não existe em
    /// nenhum DTO de resposta.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gravado sempre com <c>DateTime.UtcNow</c>.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;

    public User User { get; set; } = null!;
}
