namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato principal de transformação de texto via IA.
/// </summary>
public interface IAITextTransformationService
{
    /// <summary>
    /// Transforma o texto informado aplicando o pipeline de duas etapas
    /// (análise narrativa + redação final) no estilo "gossip".
    /// </summary>
    /// <param name="content">Texto original do usuário.</param>
    /// <param name="cancellationToken">Token de cancelamento da operação.</param>
    /// <returns>O resultado da transformação, incluindo eventuais avisos.</returns>
    Task<TextTransformationResult> TransformAsync(string content, CancellationToken cancellationToken = default);
}
