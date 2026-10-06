using System.Text.Json.Serialization;

namespace GossipCupula.Api.Anthropic;

/// <summary>Payload de erro retornado pela API da Anthropic.</summary>
public sealed class AnthropicErrorResponse
{
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("error")]
    public AnthropicErrorDetail? Error { get; init; }
}

/// <summary>Detalhe do erro retornado pela API da Anthropic.</summary>
public sealed class AnthropicErrorDetail
{
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("message")]
    public string? Message { get; init; }
}
