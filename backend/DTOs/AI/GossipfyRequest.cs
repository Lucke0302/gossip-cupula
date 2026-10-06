namespace GossipCupula.Api.DTOs.AI;

/// <summary>Corpo da requisição do endpoint <c>POST /api/ai/gossipfy</c>.</summary>
public sealed class GossipfyRequest
{
    /// <summary>Texto original que será transformado em fofoca.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Id opcional do post que está sendo gossipificado. Quando informado, o
    /// endpoint valida no banco se o post já foi transformado antes
    /// (<c>IsGossipfyed == true</c>) e recusa a operação em duplicidade.
    /// </summary>
    public Guid? PostId { get; set; }
}
