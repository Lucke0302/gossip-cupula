using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Auth;

/// <summary>
/// DTO de entrada para o login de um usuário existente.
/// </summary>
public class LoginDto
{
    [Required(ErrorMessage = "O username/e-mail é obrigatório.")]
    public string Identifier { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string Password { get; set; } = string.Empty;
}
