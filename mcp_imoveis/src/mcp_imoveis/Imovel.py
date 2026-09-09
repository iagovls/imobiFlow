from __future__ import annotations

import math
from typing import Any, Literal

from psycopg import ClientCursor, sql

from .server import _get_connection, _json_safe


class Imovel:
    id: int
    tipo: Literal["casa", "apartamento", "comercial", "rural"]
    imv_codigo: str
    titulo: str
    finalidade: Literal["venda", "aluguel"]
    preco: int
    cidade: str
    quartos: int
    suites: int
    banheiros: int
    bairro: str
    vagas_carro: int
    area_util_m2: float
    aceita_pet: bool
    mobiliado: bool
    imagem_principal: str

    schema = "pierre"
    tabela = "imoveis"
    colunas = [
        "imv_codigo",
        "titulo",
        "finalidade",
        "preco",
        "cidade",
        "quartos",
        "suites",
        "banheiros",
        "tipo",
        "bairro",
        "vagas_carro",
        "area_util_m2",
        "aceita_pet",
        "mobiliado",
        "imagem_principal",
    ]

    def buscarImoveis(
        self,
        tipo: Literal["casa", "apartamento", "comercial", "rural"] | None = None,
        cidade: str | None = None,
        bairro: str | None = None,
        finalidade: Literal["venda", "aluguel"] | None = None,
        preco: int | None = None,
        preco_min: int | None = None,
        preco_max: int | None = None,
        quartos: int | None = None,
        suites: int | None = None,
        banheiros: int | None = None,
        vagas_garagem: int | None = None,
        area_util: float | None = None,
        mobiliado: bool | None = None,
        aceita_pet: bool | None = None,
        limite: int = 100,
    ) -> list[dict[str, Any]]:
        selected_columns = sql.SQL(", ").join(sql.Identifier(coluna) for coluna in self.colunas)
        query = sql.SQL("SELECT * FROM {}.{}").format(
            sql.Identifier(self.schema),
            sql.Identifier(self.tabela),
        )

        where_clauses: list[sql.Composed | sql.SQL] = []
        params: list[Any] = []

        # Regra de negocio: nunca expor imoveis inativos ao cliente.
        where_clauses.append(
            sql.SQL("{} IS DISTINCT FROM FALSE").format(sql.Identifier("active"))
        )

        def append_equal(column: str, value: Any) -> None:
            where_clauses.append(
                sql.SQL("{} = {}").format(sql.Identifier(column), sql.Placeholder())
            )
            params.append(value)

        def append_between(column: str, min_value: Any, max_value: Any) -> None:
            where_clauses.append(
                sql.SQL("{} BETWEEN {} AND {}").format(
                    sql.Identifier(column),
                    sql.Placeholder(),
                    sql.Placeholder(),
                )
            )
            params.extend([min_value, max_value])

        def append_ilike_unaccent(column: str, value: str) -> None:
            where_clauses.append(
                sql.SQL("unaccent({}) ILIKE unaccent({})").format(
                    sql.Identifier(column),
                    sql.Placeholder(),
                )
            )
            params.append(f"%{value.strip()}%")

        def append_plus_minus_2(column: str, value: int) -> None:
            min_value = max(0, value - 2)
            max_value = value + 2
            append_between(column, min_value, max_value)

        if tipo is not None:
            append_equal("tipo", tipo)
        if cidade:
            append_ilike_unaccent("cidade", cidade)
        if bairro:
            append_ilike_unaccent("bairro", bairro)
        if finalidade is not None:
            append_equal("finalidade", finalidade)

        effective_preco_min = preco_min if preco_min is not None else preco
        effective_preco_max = preco_max if preco_max is not None else preco

        if effective_preco_min is not None and effective_preco_max is not None:
            if effective_preco_min == effective_preco_max:
                expanded_min = int(math.floor(effective_preco_min * 0.5))
                expanded_max = int(math.ceil(effective_preco_max * 1.5))
                append_between("preco", expanded_min, expanded_max)
            else:
                append_between("preco", effective_preco_min, effective_preco_max)
        elif effective_preco_min is not None:
            where_clauses.append(
                sql.SQL("{} >= {}").format(sql.Identifier("preco"), sql.Placeholder())
            )
            params.append(effective_preco_min)
        elif effective_preco_max is not None:
            where_clauses.append(
                sql.SQL("{} <= {}").format(sql.Identifier("preco"), sql.Placeholder())
            )
            params.append(effective_preco_max)

        if quartos is not None:
            append_plus_minus_2("quartos", quartos)
        if suites is not None:
            append_plus_minus_2("suites", suites)
        if banheiros is not None:
            append_plus_minus_2("banheiros", banheiros)
        if vagas_garagem is not None:
            append_plus_minus_2("vagas_carro", vagas_garagem)

        if area_util is not None:
            min_area = max(0.0, area_util * 0.5)
            max_area = area_util * 1.5
            append_between("area_util_m2", min_area, max_area)

        if mobiliado is not None:
            append_equal("mobiliado", mobiliado)
        if aceita_pet is not None:
            append_equal("aceita_pet", aceita_pet)

        if where_clauses:
            query += sql.SQL(" WHERE ") + sql.SQL(" AND ").join(where_clauses)

        query += sql.SQL(" LIMIT {}").format(sql.Placeholder())
        params.append(max(1, min(limite, 100)))

        with _get_connection() as conn:
            cur = ClientCursor(conn)

            cur.execute(query, params)
            rows = cur.fetchall()

        return _json_safe(rows)
