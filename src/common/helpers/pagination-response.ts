export function paginateResponse<T>({
  data,
  total,
  page,
  limit,
  route,
}: {
  data: T[];
  total: number;
  page: number;
  limit: number;
  route: string;
}) {
  const last_page = Math.ceil(total / limit);

  const makeUrl = (page: number) => `${route}?page=${page}&limit=${limit}`;
  const metaLinks: any = [];

  // Previous link
  metaLinks.push({
    url: page > 1 ? makeUrl(page - 1) : null,
    label: '&laquo; Previous',
    page: page > 1 ? page - 1 : null,
    active: false,
  });

  // Page number links
  for (let i = 1; i <= last_page; i++) {
    metaLinks.push({
      url: makeUrl(i),
      label: `${i}`,
      page: i,
      active: i === page,
    });
  }

  // Next link
  metaLinks.push({
    url: page < last_page ? makeUrl(page + 1) : null,
    label: 'Next &raquo;',
    page: page < last_page ? page + 1 : null,
    active: false,
  });

  return {
    data,
    links: {
      first: makeUrl(1),
      last: makeUrl(last_page),
      prev: page > 1 ? makeUrl(page - 1) : null,
      next: page < last_page ? makeUrl(page + 1) : null,
    },
    meta: {
      total,
      page,
      limit,
      totalPages: last_page,
      lastPage: last_page,
      links: metaLinks
    },
  };
}
