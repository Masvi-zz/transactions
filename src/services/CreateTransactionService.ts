import { getRepository, getCustomRepository } from "typeorm";

import AppError from "../errors/AppError";
import Category from "../models/Category";
import Transaction from "../models/Transaction";
import TransactionRepository from "../repositories/TransactionsRepository";

interface RequestDTO {
    title: string;
    value: number;
    type: "income" | "outcome";
    category: string;
}

class CreateTransactionService {
    public async execute({
        title,
        value,
        type,
        category,
    }: RequestDTO): Promise<Transaction> {
        const transactionRepository = getCustomRepository(
            TransactionRepository
        );
        const categoryRepository = getRepository(Category);

        // procura uma categoria com mesmo nome
        let transactionCategory = await categoryRepository.findOne({
            where: {
                title: category,
            },
        });

        // se nao acha, cria uma nova
        if (!transactionCategory) {
            transactionCategory = categoryRepository.create({
                title: category,
            });

            await categoryRepository.save(transactionCategory);
        }

        // verifica saldo
        const { total } = await transactionRepository.getBalance();

        if (total < value && type === "outcome") {
            throw new AppError("Insuficient Founds!");
        }

        // cria a transacao
        const transaction = transactionRepository.create({
            title,
            value,
            type,
            category: transactionCategory,
        });

        await transactionRepository.save(transaction);

        return transaction;
    }
}

export default CreateTransactionService;
