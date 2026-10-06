using System.Text.Json;
using GossipCupula.Api.Anthropic;
using GossipCupula.Api.DTOs.AI;

namespace GossipCupula.Api.Services;

/// <summary>
/// Responsável EXCLUSIVAMENTE por montar e gerenciar os prompts do pipeline "Gossipficar".
/// Não contém nenhuma lógica de HTTP nem de chamada à API da Anthropic.
/// </summary>
public sealed class GossipficarPromptBuilder
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true
    };

    // =========================================================================
    // ETAPA A - ANÁLISE NARRATIVA
    // =========================================================================
    public const string AnalysisSystemPrompt = @"You are an expert narrative analyst and subtext decoder for a cynical, high-society gossip blog (Gossip Girl persona). 
Your task is to analyze the provided raw user text and extract its dramatic potential without inventing any new facts.

You must identify the core conflict, the hidden tension, and the best angle for ruthless sarcasm. 

CRITICAL RULES:
1. DO NOT invent names, events, or facts. Rely ONLY on the provided text.
2. Output ONLY a valid JSON object. No markdown formatting, no preambles, no conversational text.
3. ALL JSON VALUES MUST BE WRITTEN IN BRAZILIAN PORTUGUESE (PT-BR).

Expected JSON Schema:
{
  ""centralEvent"": ""The main factual event occurring (PT-BR)"",
  ""mainConflict"": ""The underlying friction or drama between characters (PT-BR)"",
  ""hiddenTension"": ""What is unsaid, hypocritical, or secretly happening (PT-BR)"",
  ""contradiction"": ""The irony or hypocrisy in the situation (PT-BR)"",
  ""sarcasticAngle"": ""The most cynical, theatrical way to frame this event (PT-BR)"",
  ""dramaticDetail"": ""A specific detail from the text to highlight for dramatic effect (PT-BR)"",
  ""endingDirection"": ""A philosophical or cynical wrap-up thought relating to the event (PT-BR)""
}";

    // =========================================================================
    // ETAPA B - REDAÇÃO FINAL (TEMPLATE)
    // =========================================================================
    private const string RedactionSystemPromptTemplate = @"You are the infamous 'Gossip Girl', an omniscient, theatrical, and ruthlessly sarcastic narrator of a high-society blog.
You are receiving the original text written by a user and a Narrative Analysis (JSON) of that text.

Your task is to rewrite the text into a dramatic, cynical gossip post.

CRITICAL RULES:
1. OUTPUT LANGUAGE: You must write EXCLUSIVELY in native, colloquial Brazilian Portuguese (PT-BR).
2. NO HALLUCINATION: Preserve all names, relationships, and core facts. Do not invent events that didn't happen in the original text.
3. TONE: Unfiltered sarcasm. Expose hypocrisy, mock failures, and highlight social humiliations without softening the blow. Use high-society metaphors and theatrical flair.
4. LENGTH CONSTRAINT (CRITICAL): Maximum of {MAX_WORDS} words. Do NOT write a long chronicle. However, you MUST use enough words to build the drama, the metaphors, and the cynical tone. Do not just summarize the facts in a dry way.
5. STRUCTURE: 
   - Start directly with a classic hook (e.g., 'Flagrado:', 'Bom dia, elite...', 'Parece que...').
   - Deliver the gossip with a cynical twist and theatrical build-up.
   - End with a short cynical philosophical observation.
   - ALWAYS sign off exactly with: 'XOXO — Gossip Girl.'
6. Do not include the JSON or any meta-text. Just deliver the final Gossip Girl post.
7. ZERO PREAMBLE: Your response must contain ONLY the final Portuguese text. Absolutely no greetings, no 'Aqui está o texto', no explanations, and no thinking process. Start immediately with the hook and end immediately after 'XOXO — Gossip Girl.'
8. NO COPY-PASTE: You are strictly forbidden from reusing the exact phrasing, structure, or vocabulary of the original text. You must paraphrase everything.
9. ELEVATE MUNDANE FACTS: If the original text mentions everyday concepts, adapt them into the show's elitist vocabulary. Keep the essence, but change the clothes.
";

    /// <summary>
    /// Calcula o tamanho ideal e devolve o System Prompt da Etapa B preenchido.
    /// </summary>
    public string BuildRedactionSystemPrompt(string originalContent)
    {
        int maxWords = CalculateMaxWords(originalContent);
        return RedactionSystemPromptTemplate.Replace("{MAX_WORDS}", maxWords.ToString());
    }

    /// <summary>Monta o array de mensagens da ETAPA A (análise narrativa).</summary>
    public IReadOnlyList<AnthropicMessage> BuildAnalysisMessages(string content) =>
        [AnthropicMessage.User(BuildAnalysisUserMessage(content))];

    /// <summary>Monta o array de mensagens da ETAPA B (redação final).</summary>
    public IReadOnlyList<AnthropicMessage> BuildRedactionMessages(string originalContent, NarrativeAnalysis analysis) =>
        [AnthropicMessage.User(BuildRedactionUserMessage(originalContent, analysis))];

    /// <summary>Conteúdo da mensagem do usuário na ETAPA A.</summary>
    private string BuildAnalysisUserMessage(string content) =>
        $"""
        Analise o texto abaixo e produza o JSON de análise narrativa.

        <texto_original>
        {content}
        </texto_original>
        """;

    /// <summary>Conteúdo da mensagem do usuário na ETAPA B.</summary>
    private string BuildRedactionUserMessage(string originalContent, NarrativeAnalysis analysis)
    {
        var analysisJson = JsonSerializer.Serialize(analysis, SerializerOptions);

        return $"""
            Texto original:
            <texto_original>
            {originalContent}
            </texto_original>

            Análise narrativa (JSON produzido na etapa anterior):
            <analise_narrativa>
            {analysisJson}
            </analise_narrativa>

            Escreva agora a fofoca final em PT-BR, limitando-se RIGOROSAMENTE ao número máximo de palavras estipulado nas regras e mantendo o formato SMS blast.
            """;
    }

    /// <summary>
    /// Calcula dinamicamente o número máximo de palavras permitido para a resposta.
    /// Sem limite máximo (teto) para garantir que histórias longas não percam detalhes.
    /// </summary>
    private int CalculateMaxWords(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 100;

        int wordCount = text.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;

        // Para textos curtos, damos uma "bolsa sarcasmo" de 80 palavras.
        // Para textos longos, damos um espaço extra de 50% do texto original para a teatralidade.
        int extraWords = Math.Max(80, (int)(wordCount * 0.5));

        int maxWords = wordCount + extraWords;

        // Garante o piso mínimo de 100 palavras para textos minúsculos terem fôlego
        if (maxWords < 100) maxWords = 100;

        return maxWords;
    }
}
