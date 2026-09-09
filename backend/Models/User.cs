namespace GossipCupula.Api.Models;

/// <summary>
/// Representa um usuário autenticado do sistema.
/// </summary>
public class User
{
    public Guid Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Role do usuário: "User" ou "Admin".
    /// Posts são 100% anônimos; apenas usuários "Admin" podem editar/deletar posts.
    /// </summary>
    public string Role { get; set; } = "User";

    /// <summary>
    /// Indica se o e-mail do usuário foi confirmado
    /// (POST /api/auth/confirm-email). Exigido para login.
    /// </summary>
    public bool IsEmailConfirmed { get; set; } = false;

    /// <summary>
    /// Indica se a conta foi aprovada por um administrador
    /// (POST /api/admin/users/{id}/approve). Exigido para login.
    /// </summary>
    public bool IsApprovedByAdmin { get; set; } = false;

    /// <summary>
    /// Refresh token (opaco) usado em POST /api/auth/refresh.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Data de expiração do Refresh Token (DateTime.UtcNow).
    /// </summary>
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PostVote> Votes { get; set; } = new List<PostVote>();
}
