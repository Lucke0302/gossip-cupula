using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de entrada do <c>POST /api/posts</c> em <c>multipart/form-data</c>:
/// texto + arquivos de imagem no mesmo request.
/// <para>
/// Campos do formulário: <c>text</c> (obrigatório — vira o conteúdo do post),
/// <c>title</c> (opcional; quando ausente, o título é derivado do texto) e
/// <c>images</c> (zero ou mais arquivos <c>image/*</c>).
/// </para>
/// <para>
/// O que <b>não</b> existe aqui é campo de autor: o post continua 100%
/// anônimo ("Gossip Girl"). O usuário do token serve só para autorizar.
/// </para>
/// </summary>
public class CreatePostFormRequest : IValidatableObject
{
    /// <summary>Máximo de imagens por post (uma chamada de upload para cada).</summary>
    public const int MaxImages = 10;

    /// <summary>Tamanho máximo de cada imagem (10 MB).</summary>
    public const long MaxImageSizeBytes = 10 * 1024 * 1024;

    /// <summary>Tamanho máximo do título, alinhado à coluna <c>Posts.Title</c>.</summary>
    public const int MaxTitleLength = 200;

    /// <summary>
    /// Tipos de imagem aceitos — lista fechada. O ContentType vem do cliente,
    /// mas restringir aqui evita subir PDF/executável para um bucket público.
    /// </summary>
    private static readonly string[] AllowedContentTypes =
    [
        "image/jpeg",
        "image/pjpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    /// <summary>Texto do post (o corpo do babado). Obrigatório.</summary>
    [Required(ErrorMessage = "O texto é obrigatório.")]
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Título/manchete. Opcional: o formulário novo manda só o texto, e o
    /// serviço deriva o título da primeira linha quando este campo falta.
    /// </summary>
    [StringLength(MaxTitleLength, ErrorMessage = "O título deve ter no máximo 200 caracteres.")]
    public string? Title { get; set; }

    /// <summary>Arquivos de imagem anexados (opcional).</summary>
    public List<IFormFile>? Images { get; set; }

    /// <summary>
    /// Indica se o conteúdo enviado já passou pelo pipeline de gossipficação
    /// (IA). Campo opcional do formulário; padrão <c>false</c>.
    /// </summary>
    public bool IsGossipfyed { get; set; } = false;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // [Required] barra vazio, mas deixa passar texto só com espaços.
        if (string.IsNullOrWhiteSpace(Text))
        {
            yield return new ValidationResult(
                "Escreve alguma coisa: o post não pode estar vazio.",
                [nameof(Text)]);
        }

        if (Images is null || Images.Count == 0)
        {
            yield break;
        }

        if (Images.Count > MaxImages)
        {
            yield return new ValidationResult(
                $"Envie no máximo {MaxImages} imagens por post.",
                [nameof(Images)]);
        }

        foreach (var image in Images)
        {
            if (image.Length <= 0)
            {
                yield return new ValidationResult(
                    $"A imagem '{image.FileName}' está vazia.",
                    [nameof(Images)]);
                continue;
            }

            if (image.Length > MaxImageSizeBytes)
            {
                yield return new ValidationResult(
                    $"A imagem '{image.FileName}' passa de {MaxImageSizeBytes / (1024 * 1024)} MB.",
                    [nameof(Images)]);
            }

            if (!AllowedContentTypes.Contains(image.ContentType, StringComparer.OrdinalIgnoreCase))
            {
                yield return new ValidationResult(
                    $"O arquivo '{image.FileName}' não é uma imagem aceita (use JPEG, PNG, WEBP ou GIF).",
                    [nameof(Images)]);
            }
        }
    }
}
