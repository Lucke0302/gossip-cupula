using System.Text.Json.Serialization;

namespace GossipCupula.Api.Anthropic;

/// <summary>Resposta do endpoint <c>POST /v1/messages</c> da Anthropic.</summary>
public sealed class AnthropicMessagesResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("model")]
    public string? Model { get; init; }

    [JsonPropertyName("stop_reason")]
    public string? StopReason { get; init; }

    [JsonPropertyName("content")]
    public List<AnthropicContentBlock> Content { get; init; } = [];

    [JsonPropertyName("usage")]
    public AnthropicUsage? Usage { get; init; }

    /// <summary>Concatena o texto de todos os blocos do tipo "text" retornados pela API.</summary>
    public string ExtractText() =>
        string.Join(
            Environment.NewLine,
            Content
                .Where(block => string.Equals(block.Type, "text", StringComparison.OrdinalIgnoreCase))
                .Select(block => block.Text)
                .Where(text => !string.IsNullOrEmpty(text)));
}

/// <summary>Bloco de conteúdo retornado pela API (ex.: <c>{ "type": "text", "text": "..." }</c>).</summary>
public sealed class AnthropicContentBlock
{
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("text")]
    public string? Text { get; init; }
}

/// <summary>Contabilização de tokens consumidos na chamada.</summary>
public sealed class AnthropicUsage
{
    [JsonPropertyName("input_tokens")]
    public int InputTokens { get; init; }

    [JsonPropertyName("output_tokens")]
    public int OutputTokens { get; init; }
}
