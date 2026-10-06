namespace GossipCupula.Api.Exceptions;

/// <summary>
/// Exceção lançada quando o pipeline de transformação via IA falha de forma irrecuperável
/// (ex.: timeout, erro 401/403, resposta inválida da API da Anthropic).
/// </summary>
public sealed class AITransformationException : Exception
{
    /// <summary>Código de status HTTP associado à falha, quando aplicável.</summary>
    public int? StatusCode { get; }

    public AITransformationException(string message, int? statusCode = null, Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
