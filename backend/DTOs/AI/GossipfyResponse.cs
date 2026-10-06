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
}
