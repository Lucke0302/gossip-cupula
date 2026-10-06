using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Posts;

/// <summary>
/// DTO de entrada para a edição do conteúdo de um post existente.
/// </summary>
public class UpdatePostDto
{
    [Required(ErrorMessage = "O conteúdo é obrigatório.")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Flag de gossipficação (IA). É anulável de propósito: quando ausente
    /// (<c>null</c>) a flag existente é preservada, e não resetada — assim uma
    /// edição de conteúdo não "des-gossipifica" um post por acidente.
    /// </summary>
    public bool? IsGossipfyed { get; set; }
}
