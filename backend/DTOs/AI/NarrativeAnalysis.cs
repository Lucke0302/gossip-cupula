using System.Text.Json.Serialization;

namespace GossipCupula.Api.DTOs.AI;

/// <summary>
/// Resultado da ETAPA A (análise narrativa): o JSON estruturado que o Claude
/// devolve descrevendo personagens, relações, segredos e ganchos de fofoca
/// extraídos do texto original.
/// </summary>
public sealed class NarrativeAnalysis
{
    [JsonPropertyName("mainSubject")]
    public string? MainSubject { get; init; }

    [JsonPropertyName("secondarySubjects")]
    public List<string> SecondarySubjects { get; init; } = [];

    [JsonPropertyName("relationship")]
    public string? Relationship { get; init; }

    [JsonPropertyName("coreEvent")]
    public string? CoreEvent { get; init; }

    [JsonPropertyName("publicFacade")]
    public string? PublicFacade { get; init; }

    [JsonPropertyName("privateSin")]
    public string? PrivateSin { get; init; }

    [JsonPropertyName("hypocrisy")]
    public string? Hypocrisy { get; init; }

    [JsonPropertyName("secret")]
    public string? Secret { get; init; }

    [JsonPropertyName("socialHumiliation")]
    public string? SocialHumiliation { get; init; }

    [JsonPropertyName("suggestedNicknames")]
    public List<string> SuggestedNicknames { get; init; } = [];

    [JsonPropertyName("punAngle")]
    public string? PunAngle { get; init; }

    [JsonPropertyName("categoryHint")]
    public string? CategoryHint { get; init; }

    [JsonPropertyName("toneNotes")]
    public string? ToneNotes { get; init; }
}
