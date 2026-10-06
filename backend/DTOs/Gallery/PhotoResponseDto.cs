namespace GossipCupula.Api.DTOs.Gallery;

/// <summary>
/// Foto da galeria como ela trafega na resposta (itens do <c>GET /api/photos</c>).
/// <para>
/// O contrato na rede é exatamente <c>{ id, url, alt, caption, width, height,
/// publishedAt }</c> — o mesmo que o front valida em
/// <c>frontend/src/types/index.ts</c> (<c>photoSchema</c>, que é
/// <c>.strict()</c>). Qualquer campo extra faz a validação Zod do front
/// quebrar com <c>unrecognized_keys</c>.
/// </para>
/// <para>
/// <c>id</c> é <b>string</b> opaca (o GUID do post em formato <c>N</c> seguido
/// do índice da imagem), e não o Id do post: um mesmo post contribui com
/// várias fotos, cada uma precisa de id próprio. <c>publishedAt</c> vem
/// arredondado para a HORA cheia em UTC (<c>coarseTimestampSchema</c>).
/// </para>
/// </summary>
public class PhotoResponseDto
{
    /// <summary>Id opaco da foto: <c>{postId:N}{indice:D2}</c>.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>URL pública da imagem (bucket do OCI), sempre absoluta.</summary>
    public string Url { get; set; } = string.Empty;

    public string Alt { get; set; } = string.Empty;

    public string Caption { get; set; } = string.Empty;

    public int Width { get; set; }

    public int Height { get; set; }

    /// <summary>
    /// Instante de criação do post arredondado para a hora cheia (UTC), no
    /// formato ISO-8601 com offset (ex: <c>2026-10-06T14:00:00Z</c>).
    /// </summary>
    public DateTime PublishedAt { get; set; }
}
