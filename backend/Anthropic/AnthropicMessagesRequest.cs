using System.Text.Json.Serialization;

namespace GossipCupula.Api.Anthropic;

/// <summary>
/// Payload enviado para o endpoint <c>POST /v1/messages</c> da Anthropic.
/// Observação: a API "messages" aceita o <c>system</c> prompt na raiz do payload
/// e as mensagens do usuário no array <c>messages</c>.
/// </summary>
public sealed class AnthropicMessagesRequest
{
    [JsonPropertyName("model")]
    public string Model { get; init; } = string.Empty;

    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; init; }

    [JsonPropertyName("temperature")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Temperature { get; init; }

    /// <summary>System prompt (nível raiz do payload).</summary>
    [JsonPropertyName("system")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? System { get; init; }

    [JsonPropertyName("messages")]
    public IReadOnlyList<AnthropicMessage> Messages { get; init; } = [];
}

/// <summary>Representa um item do array <c>messages</c> (roles válidos: "user" | "assistant").</summary>
public sealed class AnthropicMessage
{
    [JsonPropertyName("role")]
    public string Role { get; init; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;

    /// <summary>Cria uma mensagem do usuário.</summary>
    public static AnthropicMessage User(string content) => new() { Role = "user", Content = content };
}
