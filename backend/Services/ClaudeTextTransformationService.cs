using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GossipCupula.Api.Anthropic;
using GossipCupula.Api.Configuration;
using GossipCupula.Api.DTOs.AI;
using GossipCupula.Api.Exceptions;
using Microsoft.Extensions.Options;

namespace GossipCupula.Api.Services;

/// <summary>
/// Implementação de <see cref="IAITextTransformationService"/> que conversa com a
/// API da Anthropic (Claude) e executa o pipeline de duas etapas:
///   ETAPA A: análise narrativa -> JSON (NarrativeAnalysis).
///   ETAPA B: redação final (texto original + JSON da Etapa A) -> fofoca em PT-BR.
/// A lógica de prompt fica isolada em <see cref="GossipficarPromptBuilder"/>.
/// </summary>
public sealed class ClaudeTextTransformationService : IAITextTransformationService
{
    private const string MessagesEndpoint = "/v1/messages";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly AnthropicOptions _options;
    private readonly GossipficarPromptBuilder _promptBuilder;
    private readonly ILogger<ClaudeTextTransformationService> _logger;

    public ClaudeTextTransformationService(
        HttpClient httpClient,
        IOptions<AnthropicOptions> options,
        GossipficarPromptBuilder promptBuilder,
        ILogger<ClaudeTextTransformationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _promptBuilder = promptBuilder;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TextTransformationResult> TransformAsync(string content, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new AITransformationException("O conteúdo a ser transformado não pode ser vazio.");
        }

        var warnings = new List<string>();

        // ---------- ETAPA A: Análise narrativa ----------
        var analysis = await RunAnalysisStepAsync(content, warnings, cancellationToken);

        // ---------- ETAPA B: Redação final ----------
        var transformedContent = await RunRedactionStepAsync(content, analysis, cancellationToken);

        return new TextTransformationResult
        {
            OriginalContent = content,
            TransformedContent = transformedContent,
            Warnings = warnings
        };
    }

    /// <summary>
    /// ETAPA A: envia o texto do usuário com o System Prompt de "Análise Narrativa"
    /// e faz o parse do JSON retornado para <see cref="NarrativeAnalysis"/>.
    /// Em caso de falha de parse, gera um aviso e prossegue com a análise vazia.
    /// </summary>
    private async Task<NarrativeAnalysis> RunAnalysisStepAsync(
        string content,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        var request = new AnthropicMessagesRequest
        {
            Model = _options.AnalysisModel,
            MaxTokens = _options.MaxTokens,
            Temperature = _options.Temperature,
            System = GossipficarPromptBuilder.AnalysisSystemPrompt,
            Messages = _promptBuilder.BuildAnalysisMessages(content)
        };

        var rawText = await SendAsync(request, "análise narrativa (Etapa A)", cancellationToken);

        try
        {
            var json = ExtractJsonObject(rawText);
            var analysis = JsonSerializer.Deserialize<NarrativeAnalysis>(json, JsonOptions);

            if (analysis is null)
            {
                throw new JsonException("O JSON da Etapa A foi desserializado como null.");
            }

            return analysis;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Falha ao interpretar o JSON da Etapa A. Prosseguindo apenas com o texto original. Conteúdo bruto: {Raw}", rawText);

            warnings.Add("Não foi possível interpretar o JSON da Etapa A. A redação final foi gerada apenas com o texto original.");

            return new NarrativeAnalysis();
        }
    }

    /// <summary>
    /// ETAPA B: envia o texto original + o JSON da Etapa A com o System Prompt de
    /// "Redação Final" e retorna o texto final formatado.
    /// </summary>
    private async Task<string> RunRedactionStepAsync(
        string content,
        NarrativeAnalysis analysis,
        CancellationToken cancellationToken)
    {
        var request = new AnthropicMessagesRequest
        {
            Model = _options.RedactionModel,
            MaxTokens = _options.MaxTokens,
            Temperature = _options.Temperature,
            System = _promptBuilder.BuildRedactionSystemPrompt(content),
            Messages = _promptBuilder.BuildRedactionMessages(content, analysis)
        };

        var text = await SendAsync(request, "redação final (Etapa B)", cancellationToken);

        text = text.Trim();

        text = text.Replace("\r\n", " ").Replace("\n", " ");

        while (text.Contains("  "))
        {
            text = text.Replace("  ", " ");
        }

        return text;
    }

    /// <summary>Executa uma chamada HTTP ao endpoint /v1/messages e retorna o texto gerado.</summary>
    private async Task<string> SendAsync(
        AnthropicMessagesRequest request,
        string stepName,
        CancellationToken cancellationToken)
    {
        var apiKey = _options.ResolveApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new AITransformationException(
                $"A chave da API da Anthropic não foi configurada. Defina 'Anthropic:ApiKey' no appsettings " +
                $"ou a variável de ambiente '{AnthropicOptions.ApiKeyEnvironmentVariable}'.");
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, MessagesEndpoint)
        {
            Content = JsonContent.Create(request, options: JsonOptions)
        };
        httpRequest.Headers.Add("x-api-key", apiKey);
        httpRequest.Headers.Add("anthropic-version", _options.ApiVersion);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        HttpResponseMessage response;

        try
        {
            response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new AITransformationException($"Tempo limite excedido na etapa de {stepName} ao chamar a API da Anthropic.");
        }
        catch (HttpRequestException ex)
        {
            throw new AITransformationException($"Falha de comunicação com a API da Anthropic na etapa de {stepName}.", innerException: ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new AITransformationException(
                    BuildErrorMessage(response, errorBody, stepName),
                    statusCode: (int)response.StatusCode);
            }

            var payload = await response.Content.ReadFromJsonAsync<AnthropicMessagesResponse>(JsonOptions, cancellationToken)
                          ?? throw new AITransformationException($"A API da Anthropic retornou uma resposta vazia na etapa de {stepName}.");

            var text = payload.ExtractText();
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new AITransformationException($"A API da Anthropic não retornou texto na etapa de {stepName}.");
            }

            _logger.LogInformation(
                "Etapa '{Step}' concluída. Tokens de entrada: {InputTokens}; tokens de saída: {OutputTokens}.",
                stepName,
                payload.Usage?.InputTokens,
                payload.Usage?.OutputTokens);

            return text;
        }
    }

    /// <summary>Monta uma mensagem de erro amigável a partir da resposta da API.</summary>
    private static string BuildErrorMessage(HttpResponseMessage response, string errorBody, string stepName)
    {
        var statusCode = (int)response.StatusCode;

        string detail;
        try
        {
            var parsed = JsonSerializer.Deserialize<AnthropicErrorResponse>(errorBody, JsonOptions);
            detail = parsed?.Error?.Message ?? errorBody;
        }
        catch (JsonException)
        {
            detail = errorBody;
        }

        var friendly = statusCode switch
        {
            401 => "A chave da API da Anthropic é inválida ou não foi informada (401 Unauthorized).",
            403 => "A chave da API não tem permissão para o modelo solicitado (403 Forbidden).",
            404 => "O modelo/recurso solicitado não foi encontrado na API da Anthropic (404 Not Found).",
            429 => "O limite de requisições da API da Anthropic foi excedido (429 Too Many Requests).",
            >= 500 => "A API da Anthropic está indisponível no momento.",
            _ => $"A API da Anthropic retornou o status {statusCode}."
        };

        return $"Erro na etapa de {stepName}: {friendly} Detalhe: {detail}";
    }

    /// <summary>
    /// Isola o objeto JSON da resposta bruta, removendo eventuais cercas de código
    /// markdown (```json ... ```) e texto adicional ao redor.
    /// </summary>
    private static string ExtractJsonObject(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var text = raw.Trim();

        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            var firstLineBreak = text.IndexOf('\n');
            if (firstLineBreak >= 0)
            {
                text = text[(firstLineBreak + 1)..];
            }

            var closingFence = text.LastIndexOf("```", StringComparison.Ordinal);
            if (closingFence >= 0)
            {
                text = text[..closingFence];
            }
        }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            text = text[start..(end + 1)];
        }

        return text.Trim();
    }
}
