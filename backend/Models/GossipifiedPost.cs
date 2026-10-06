namespace GossipCupula.Api.Models;

/// <summary>
/// Registro de rastreio de um texto que já passou pelo pipeline de gossipficação
/// (IA da Anthropic).
/// <para>
/// Substitui a antiga flag booleana <c>Post.IsGossipfyed</c>. Cada execução do
/// endpoint <c>POST /api/ai/gossipfy</c> gera um novo <see cref="GossipifiedPost"/>
/// e devolve o seu <see cref="Id"/> ao cliente. A partir daí esse Id é o token de
/// rastreio da transformação:
/// </para>
/// <list type="bullet">
///   <item>Um post definitivo do blog guarda o Id na FK opcional
///   <c>Post.GossipifiedPostId</c>.</item>
///   <item>Um texto temporário ainda em edição no frontend é reenviado no campo
///   <c>gossipifiedPostId</c> do request do endpoint de IA.</item>
/// </list>
/// <para>
/// Nos dois casos, se o Id já existir na tabela <c>GossipifiedPosts</c>, a
/// transformação é recusada (400): o texto já foi gossipificado e não pode ser
/// transformado de novo.
/// </para>
/// </summary>
public class GossipifiedPost
{
    public Guid Id { get; set; }

    /// <summary>Gravado sempre com <c>DateTime.UtcNow</c>.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
