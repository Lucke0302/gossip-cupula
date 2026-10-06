using System.Text.RegularExpressions;
using GossipCupula.Api.Data;
using GossipCupula.Api.DTOs.Common;
using GossipCupula.Api.DTOs.Gallery;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Services;

/// <summary>
/// Links: extrai as URLs externas do TEXTO dos posts, achata
/// (<c>SelectMany</c>) e pagina por cursor opaco.
/// <para>
/// O contrato (<c>linkSchema</c> no front) pede
/// <c>{ id, label, url, note, section }</c>. O banco não guarda link curado: só
/// o conteúdo do post. Então a URL sai do próprio texto e <c>label</c>,
/// <c>note</c> e <c>section</c> são derivados — está anotado no mapeamento. Uma
/// tabela de links curados resolveria isso sem adivinhação.
/// </para>
/// <para>
/// <b>Performance:</b> um <c>LIKE '%http%'</c> corta os posts sem link nenhum
/// antes de trazer qualquer linha, e a projeção traz só <c>Id</c>,
/// <c>Title</c>, <c>CreatedAt</c> e <c>Content</c>.
/// </para>
/// </summary>
public class LinkService(AppDbContext dbContext) : ILinkService
{
    /// <summary>Tamanho da página quando a query string não informa <c>limit</c>.</summary>
    public const int DefaultPageSize = 20;

    /// <summary>Teto de itens por página — protege de um <c>limit</c> gigante.</summary>
    public const int MaxPageSize = 100;

    /// <summary>
    /// Seção assumida. O front usa <c>section</c> para agrupar a página e a API
    /// não tem como inferir a seção de uma URL solta no texto — tudo entra no
    /// grupo "links".
    /// </summary>
    private const string DefaultSection = "links";

    /// <summary>
    /// URL absoluta: só http/https, para não arrastar esquemas esquisitos
    /// (<c>javascript:</c>, <c>data:</c>) de um texto qualquer.
    /// </summary>
    private static readonly Regex UrlPattern = new(
        @"https?://[^\s<>""'()\[\]{}]+",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>Pontuação que costuma colar na URL no fim de uma frase.</summary>
    private static readonly char[] TrailingPunctuation = ['.', ',', ';', ':', '!', '?', ')', ']', '}'];

    public async Task<Page<LinkResponseDto>> GetPageAsync(string? cursor, int limit)
    {
        var pageSize = Math.Clamp(limit, 1, MaxPageSize);

        var posts = await dbContext.Posts
            .AsNoTracking()
            .Where(post => post.Content.Contains("http"))
            .OrderByDescending(post => post.CreatedAt)
            .ThenByDescending(post => post.Id)
            .Select(post => new
            {
                post.Id,
                post.Title,
                post.CreatedAt,
                post.Content
            })
            .ToListAsync();

        var links = posts.SelectMany(post => Extract(post.Content)
            .Select((url, index) => new FlatLink(post.Id, post.Title, post.CreatedAt, index, url)));

        if (OpaqueCursor.TryDecode(cursor, out OpaqueCursor.IndexedCursorValue after))
        {
            links = links.Where(link => IsAfter(link, after));
        }

        var rows = links.Take(pageSize + 1).ToList();
        var hasMore = rows.Count > pageSize;
        var page = hasMore ? rows[..pageSize] : rows;

        var items = page.Select(ToResponseDto).ToList();

        return new Page<LinkResponseDto>
        {
            Items = items,
            NextCursor = hasMore && page.Count > 0
                ? OpaqueCursor.Encode(page[^1].CreatedAt, page[^1].PostId, page[^1].Index)
                : null
        };
    }

    /// <summary>
    /// URLs externas do texto, na ordem em que aparecem, sem repetição dentro
    /// do mesmo post (o mesmo link citado duas vezes não vira dois itens). A
    /// estabilidade dessa ordem é o que sustenta o keyset: o índice de uma URL
    /// não muda entre uma página e outra.
    /// </summary>
    private static IEnumerable<string> Extract(string content)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in UrlPattern.Matches(content))
        {
            var url = match.Value.TrimEnd(TrailingPunctuation);

            if (Uri.TryCreate(url, UriKind.Absolute, out _) && seen.Add(url))
            {
                yield return url;
            }
        }
    }

    private static bool IsAfter(FlatLink link, OpaqueCursor.IndexedCursorValue after) =>
        link.CreatedAt < after.CreatedAt ||
        (link.CreatedAt == after.CreatedAt && link.PostId.CompareTo(after.Id) < 0) ||
        (link.CreatedAt == after.CreatedAt && link.PostId == after.Id && link.Index > after.Index);

    /// <summary>
    /// <c>note</c> recebe o título do post — é o contexto que existe para
    /// explicar de onde o link veio.
    /// </summary>
    private static LinkResponseDto ToResponseDto(FlatLink link) => new()
    {
        Id = $"{link.PostId:N}{link.Index:D2}",
        Label = BuildLabel(link.Url),
        Url = link.Url,
        Note = link.Title,
        Section = DefaultSection
    };

    /// <summary>
    /// Rótulo do link. O banco não guarda título de link, então usa o host
    /// (sem o <c>www.</c>) — melhor que repetir a URL inteira na tela.
    /// </summary>
    private static string BuildLabel(string url)
    {
        var host = new Uri(url).Host;
        return host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : host;
    }

    private sealed record FlatLink(Guid PostId, string Title, DateTime CreatedAt, int Index, string Url);
}
