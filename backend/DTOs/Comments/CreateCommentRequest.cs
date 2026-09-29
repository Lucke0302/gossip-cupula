using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Comments;

/// <summary>
/// Corpo do <c>POST /api/posts/{postId}/comments</c> — exatamente o que o
/// front envia: <c>{ "text": "..." }</c>.
/// <para>
/// Não existe campo de autor no payload: o comentário é 100% anônimo e o
/// autor (quem está logado) serve apenas para autenticar a requisição, nunca
/// para ser gravado.
/// </para>
/// </summary>
public class CreateCommentRequest : IValidatableObject
{
    /// <summary>Tamanho máximo do comentário, alinhado ao front (500 caracteres).</summary>
    public const int MaxLength = 500;

    [Required(ErrorMessage = "O texto do comentário é obrigatório.")]
    [StringLength(MaxLength, ErrorMessage = "O comentário deve ter no máximo 500 caracteres.")]
    public string Text { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // [Required] barra vazio, mas deixa passar texto só com espaços.
        if (string.IsNullOrWhiteSpace(Text))
        {
            yield return new ValidationResult(
                "Escreve alguma coisa: o comentário não pode estar vazio.",
                [nameof(Text)]);
        }
    }
}
