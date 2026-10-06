namespace GossipCupula.Api.Configuration;

/// <summary>
/// Opções de configuração da integração com a API da Anthropic (Claude).
/// Os valores são vinculados à seção "Anthropic" do appsettings.json ou a
/// variáveis de ambiente. A chave de API NUNCA deve ser hardcoded no código.
/// </summary>
public sealed class AnthropicOptions
{
    /// <summary>Nome da seção de configuração.</summary>
    public const string SectionName = "Anthropic";

    /// <summary>Variável de ambiente usada como fallback para a chave da API.</summary>
    public const string ApiKeyEnvironmentVariable = "ANTHROPIC_API_KEY";

    /// <summary>Chave de API da Anthropic (preenchida via appsettings, secrets ou env var).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>URL base da API da Anthropic.</summary>
    public string BaseUrl { get; set; } = "https://api.anthropic.com";

    /// <summary>Modelo Claude usado na ETAPA A (análise narrativa).</summary>
    public string AnalysisModel { get; set; } = "claude-haiku-4-5-20251001";

    /// <summary>Modelo Claude usado na ETAPA B (redação final).</summary>
    public string RedactionModel { get; set; } = "claude-sonnet-5-5";

    /// <summary>Versão da API enviada no header "anthropic-version".</summary>
    public string ApiVersion { get; set; } = "2023-06-01";

    /// <summary>Número máximo de tokens gerados por chamada.</summary>
    public int MaxTokens { get; set; } = 2048;

    /// <summary>Temperatura de amostragem (0.0 a 1.0).</summary>
    public double Temperature { get; set; } = 1.0;

    /// <summary>Timeout, em segundos, de cada chamada HTTP.</summary>
    public int TimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Retorna a chave efetiva: prioriza a configuração e, quando vazia,
    /// recorre à variável de ambiente <see cref="ApiKeyEnvironmentVariable"/>.
    /// </summary>
    public string ResolveApiKey() =>
        string.IsNullOrWhiteSpace(ApiKey)
            ? Environment.GetEnvironmentVariable(ApiKeyEnvironmentVariable) ?? string.Empty
            : ApiKey;
}
