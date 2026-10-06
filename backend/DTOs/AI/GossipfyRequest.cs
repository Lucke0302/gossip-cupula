namespace GossipCupula.Api.DTOs.AI;

/// <summary>Corpo da requisição do endpoint <c>POST /api/ai/gossipfy</c>.</summary>
public sealed class GossipfyRequest
{
    /// <summary>Texto original que será transformado em fofoca.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Id opcional do post definitivo que está sendo gossipificado. Quando
    /// informado, o endpoint valida no banco se esse post já possui um
    /// <c>GossipifiedPostId</c> (já foi transformado) e recusa a operação em
    /// duplicidade com 400 — e devolve 404 se o post não existir.
    /// </summary>
    public Guid? PostId { get; set; }

    /// <summary>
    /// Id opcional do texto temporário (<see cref="Models.GossipifiedPost"/>)
    /// gerado numa transformação anterior e ainda não salvo como post. Quando
    /// informado, o endpoint verifica se esse Id já existe na tabela
    /// <c>GossipifiedPosts</c> e recusa a operação em duplicidade com 400 —
    /// é o guarda de dupla gossipficação para textos em edição no frontend.
    /// </summary>
    public Guid? GossipifiedPostId { get; set; }
}
