namespace GossipCupula.Api.DTOs.Gallery;

/// <summary>
/// Link da página de links como ele trafega na resposta (itens do
/// <c>GET /api/links</c>).
/// <para>
/// O contrato na rede é exatamente <c>{ id, label, url, note, section }</c> —
/// o mesmo que o front valida em <c>frontend/src/types/index.ts</c>
/// (<c>linkSchema</c>, que é <c>.strict()</c>). Qualquer campo extra faz a
/// validação Zod do front quebrar com <c>unrecognized_keys</c>.
/// </para>
/// </summary>
public class LinkResponseDto
{
    /// <summary>Id opaco do link: <c>{postId:N}{indice:D2}</c>.</summary>
    public string Id { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    /// <summary>URL externa (http/https) extraída do texto do post.</summary>
    public string Url { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    /// <summary>
    /// Seção da página em que o link é agrupado. Uma das cinco do design:
    /// <c>welcome | fofocas | fotos | eventos | links</c>.
    /// </summary>
    public string Section { get; set; } = string.Empty;
}
