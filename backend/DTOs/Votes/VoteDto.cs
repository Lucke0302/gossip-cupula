using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Votes;

/// <summary>
/// DTO de entrada para a votação em um post.
/// </summary>
public class VoteDto : IValidatableObject
{
    /// <summary>
    /// Tipo do voto: 1 para Like e -1 para Dislike.
    /// </summary>
    public int VoteType { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (VoteType is not 1 and not -1)
        {
            yield return new ValidationResult(
                "VoteType deve ser 1 (like) ou -1 (dislike).",
                [nameof(VoteType)]);
        }
    }
}
