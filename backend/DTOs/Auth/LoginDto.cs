using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO de entrada para o login de um usuário existente.
/// </summary>
public class LoginDto
{
    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string Password { get; set; } = string.Empty;
}
