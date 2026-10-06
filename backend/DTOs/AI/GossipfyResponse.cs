namespace GossipCupula.Api.DTOs.AI;

/// <summary>Resposta do endpoint <c>POST /api/ai/gossipfy</c>.</summary>
public sealed class GossipfyResponse
{
    /// <summary>Texto original recebido na requisição.</summary>
    public string OriginalContent { get; init; } = string.Empty;

    /// <summary>Texto transformado no estilo "Gossip Girl".</summary>
    public string TransformedContent { get; init; } = string.Empty;

    /// <summary>Avisos não bloqueantes gerados durante o pipeline (ex.: falha no parse da Etapa A).</summary>
    public IReadOnlyList<string> Warnings { get; init; } = [];

    /// <summary>
    /// Id do <c>GossipifiedPost</c> recém-criado para esta transformação.
    /// O frontend deve guardar e reenviar este valor (como <c>postId</c> ao criar
    /// o post definitivo, ou como <c>gossipifiedPostId</c> em nova chamada de IA).
    /// </summary>
    public Guid GossipifiedPostId { get; set; }
}
