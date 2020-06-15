
import csvParse from 'csv-parse';
import fs from 'fs';

import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionRepository from '../repositories/TransactionsRepository';
interface CSVTransaction {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class ImportTransactionsService {
    async execute(filePath: string): Promise<Transaction[]> {
        const transactionRepository = getCustomRepository(TransactionRepository);
        const categoriesRepository = getRepository(Category);

        const contactsReadStream = fs.createReadStream(filePath);

        const paresers = csvParse({
            from_line: 2,
        });

        //pipe: Le as linhas disponiveis para leitura
        const parseCSV = contactsReadStream.pipe(paresers);

        const categories: string[] = [];
        const transactions: CSVTransaction[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) =>
                cell.trim(),
            );

            if (!title || !type || !value) return;

            categories.push(category);
            transactions.push({ title, type, value, category });
        });

        await new Promise(resolve => parseCSV.on('end', resolve));

        const existsCategories = await categoriesRepository.find({
            where: { title: In(categories) },
        });

        const existsCategoriesTitle = existsCategories.map(
            (category: Category) => category.title,
        );

        const addCategoryTitle = categories
            .filter(category => !existsCategoriesTitle.includes(category))
            .filter((value, index, self) => self.indexOf(value) === index);

        const newCategories = categoriesRepository.create(
            addCategoryTitle.map(title => ({
                title,
            })),
        );

        await categoriesRepository.save(newCategories);

        const finalCategories = [...newCategories, ...existsCategories];

        const createdTransactions = transactionRepository.create(
            transactions.map(transaction => ({
                title: transaction.title,
                value: transaction.value,
                type: transaction.type,
                category: finalCategories.find(
                    category => category.title === transaction.category,
                ),
            })),
        );

        await transactionRepository.save(createdTransactions);

        await fs.promises.unlink(filePath);

        return createdTransactions;
    }
}


export default ImportTransactionsService;