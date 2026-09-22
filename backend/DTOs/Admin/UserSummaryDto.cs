namespace GossipCupula.Api.DTOs.Admin;

/// <summary>
/// DTO de resposta com o resumo de um usuário, usado no painel de
/// administração (GET /api/admin/users).
/// </summary>
/// <remarks>
/// Expõe apenas o necessário para um Admin decidir sobre uma conta.
/// PasswordHash, RefreshToken e RefreshTokenExpiryTime ficam de fora de
/// propósito — e a projeção no AuthService garante que essas colunas nem
/// saiam do banco.
///
/// Nada aqui se relaciona com posts ou comentários: a identidade de um
/// usuário nunca é cruzada com o que ele escreveu.
/// </remarks>
public class UserSummaryDto
{
    public Guid Id { get; set; }

    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// E-mail de cadastro. É como o Admin identifica quem pediu entrada;
    /// só trafega neste endpoint, que exige role "Admin".
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Role do usuário: "User" ou "Admin".
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Passo 1 da validação (POST /api/auth/confirm-email).
    /// </summary>
    public bool IsEmailConfirmed { get; set; }

    /// <summary>
    /// Passo 2 da validação (POST /api/admin/users/{id}/approve).
    /// </summary>
    public bool IsApprovedByAdmin { get; set; }

    public DateTime CreatedAt { get; set; }
}
