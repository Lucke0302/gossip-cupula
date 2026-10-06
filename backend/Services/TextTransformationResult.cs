namespace GossipCupula.Api.Services;

/// <summary>Resultado interno de uma transformação de texto (independente do transporte HTTP).</summary>
public sealed class TextTransformationResult
{
    /// <summary>Texto original informado pelo usuário.</summary>
    public string OriginalContent { get; init; } = string.Empty;

    /// <summary>Texto transformado (fofoca final).</summary>
    public string TransformedContent { get; init; } = string.Empty;

    /// <summary>Avisos não bloqueantes gerados durante o pipeline.</summary>
    public IReadOnlyList<string> Warnings { get; init; } = [];

    /// <summary>
    /// Id do <c>GossipifiedPost</c> (registro de rastreio) associado a esta
    /// transformação. Preenchido pelo endpoint após salvar o registro no banco;
    /// fica <see cref="Guid.Empty"/> enquanto a transformação existe apenas em
    /// memória, dentro do pipeline de IA.
    /// </summary>
    public Guid GossipifiedPostId { get; set; }
}
