namespace GossipCupula.Api.DTOs.Comments;

/// <summary>
/// Comentário como ele trafega na resposta (201 do POST e itens do GET).
/// <para>
/// O contrato na rede é exatamente <c>{ "id", "text", "publishedAt" }</c> —
/// o mesmo que o front valida em <c>frontend/src/types/index.ts</c>
/// (<c>commentSchema</c>, que é <c>.strict()</c>). Por isso <b>não</b> existem
/// <c>postId</c>, <c>createdAt</c> nem qualquer dado de autor: qualquer campo
/// extra faz a validação Zod do front falhar com <c>unrecognized_keys</c>. O
/// <c>postId</c> já vem na própria rota.
/// </para>
/// <para>
/// <c>publishedAt</c> é o <c>CreatedAt</c> arredondado para a HORA cheia em
/// UTC. Hora cheia é regra de anonimato, não de formatação: um instante com
/// precisão de segundos cruzado com o horário de acesso denunciaria quem
/// comentou ("foi quem saiu da mesa 23h47").
/// </para>
/// </summary>
public class CommentResponse
{
    public Guid Id { get; set; }

    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Instante de criação arredondado para a hora cheia (UTC), no formato
    /// ISO-8601 com offset (ex: <c>2026-09-29T14:00:00Z</c>).
    /// </summary>
    public DateTime PublishedAt { get; set; }
}
